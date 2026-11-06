// Refresh provisional trade data for the first year BACI does not cover yet, from UN Comtrade (Premium bulk API).
// Writes ONLY to Supabase; downloaded files are streamed and never saved to disk.
//
// Flow: getDA (which reporters published / changed) -> re-download only new or changed reporters (HS2017 edition,
// matching BACI) -> map HS6 to ADPG L1/L2 -> comtrade_flows -> rebuild_provisional() -> refresh matviews.
//
// Usage: node comtrade-sync.mjs [--year 2025] [--force] [--reporter ISO3] [--no-rebuild]
import { Readable } from 'node:stream';
import zlib from 'node:zlib';
import readline from 'node:readline';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { fetchAll } from './lib.mjs';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, COMTRADE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !COMTRADE_KEY) {
  console.error('Need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, COMTRADE_KEY');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const API = 'https://comtradeapi.un.org';
const HEAD = { 'Ocp-Apim-Subscription-Key': COMTRADE_KEY };
const BATCH = 2000;
const CONCURRENCY = 4;

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : undefined);

async function api(path, tries = 4) {
  for (let t = 1; ; t++) {
    const r = await fetch(API + path, { headers: HEAD });
    if (r.ok) return r;
    if (t >= tries || (r.status < 500 && r.status !== 429)) throw new Error(`Comtrade ${r.status} ${path.split('?')[0]}`);
    await new Promise((res) => setTimeout(res, 2000 * t));
  }
}
const apiJson = async (p) => (await (await api(p)).json()).data ?? [];

// year to refresh = first year after the last BACI year loaded
let year = Number(opt('year'));
if (!year) {
  // load_log holds one row per BACI year loaded (cheap; scanning baci_trade for max(year) can hit the API statement timeout)
  const { data, error } = await supabase.from('load_log').select('year').order('year', { ascending: false }).limit(1);
  if (error || !data?.length) throw new Error(`cannot determine last BACI year: ${error?.message ?? 'load_log empty'}`);
  year = data[0].year + 1;
}
console.log(`Comtrade refresh for ${year}`);

const map = new Map(
  (await fetchAll((a, b) => supabase.from('commodity_map').select('hs6,adpg_l1,adpg_l2').order('hs6').range(a, b))).map((r) => [r.hs6, r]),
);

const available = (await apiJson(`/data/v1/getDA/C/A/HS?period=${year}`)).filter((r) => !opt('reporter') || r.reporterISO === opt('reporter'));
const log = new Map(
  (await fetchAll((a, b) => supabase.from('comtrade_release_log').select('*').eq('period', year).order('reporter_code').range(a, b))).map((r) => [r.reporter_code, r]),
);
const todo = available.filter((r) => {
  const l = log.get(r.reporterCode);
  return flag('force') || !l || l.status !== 'loaded' || Number(l.dataset_checksum) !== r.datasetChecksum || +new Date(l.last_released) !== +new Date(r.lastReleased + 'Z');
});
const revised = todo.filter((r) => log.get(r.reporterCode)?.status === 'loaded').length;
console.log(`${available.length} reporters published; ${todo.length} to (re)load (${todo.length - revised} new, ${revised} revised)`);

// HS2012/HS2007 -> HS2017 shares (hs_conversion), used when Comtrade has no converted H5 file for a reporter
const convCache = new Map();
async function conversion(ed) {
  if (!convCache.has(ed)) {
    const m = new Map();
    for (const c of await fetchAll((a, b) => supabase.from('hs_conversion').select('from_hs6,to_hs6,share').eq('edition', ed).order('from_hs6').order('to_hs6').range(a, b)))
      (m.get(c.from_hs6) ?? m.set(c.from_hs6, []).get(c.from_hs6)).push([c.to_hs6, +c.share]);
    convCache.set(ed, m);
  }
  return convCache.get(ed);
}

async function loadReporter(r) {
  // HS2017 (H5) so codes match BACI/commodity_map. getDA lists originals only; converted H5 files exist in the bulk API.
  // No H5 file: take the as-reported edition (H3/H4) and map it to HS2017 with the UNSD correlation tables.
  let f = (await apiJson(`/bulk/v1/get/C/A/H5?reporterCode=${r.reporterCode}&period=${year}`)).find((x) => x.classificationCode === 'H5');
  let conv = null;
  if (!f) {
    const ed = r.classificationCode;
    if (ed !== 'H3' && ed !== 'H4') return { status: `no_H5_edition (${ed})` };
    f = (await apiJson(`/bulk/v1/get/C/A/${ed}?reporterCode=${r.reporterCode}&period=${year}`)).find((x) => x.classificationCode === ed);
    if (!f) return { status: 'no_file' };
    conv = await conversion(ed);
  }

  const res = await api(f.fileUrl.replace(API, ''));
  const rl = readline.createInterface({ input: Readable.fromWeb(res.body).pipe(zlib.createGunzip()), crlfDelay: Infinity });
  let col = null;
  const agg = new Map();
  let read = 0, kept = 0, unmapped = 0;
  for await (const line of rl) {
    const p = line.split('\t');
    if (!col) { col = Object.fromEntries(p.map((n, i) => [n, i])); continue; }
    read++;
    const flow = p[col.flowCode];
    if (flow !== 'M' && flow !== 'X') continue;
    // rows with partner2=0, customs C00, mode 0 are the totals across transport mode / second partner (isAggregate=1)
    if (p[col.partner2Code] !== '0' || p[col.customsCode] !== 'C00' || p[col.motCode] !== '0') continue;
    const hs = p[col.cmdCode];
    const partner = +p[col.partnerCode];
    if (hs.length !== 6 || !partner) continue;
    const targets = conv ? conv.get(hs) : [[hs, 1]];
    if (!targets) { unmapped++; continue; }
    for (const [h17, share] of targets) {
      const m = map.get(h17);
      if (!m) { unmapped++; continue; }
      const key = `${flow}|${partner}|${m.adpg_l1}|${m.adpg_l2}`;
      const e = agg.get(key) ?? [0, 0];
      e[0] += (+p[col.primaryValue] || 0) * share;
      e[1] += ((+p[col.netWgt] || 0) / 1000) * share;
      agg.set(key, e);
    }
    kept++;
  }
  const rows = [];
  for (const [k, [v, q]] of agg) {
    const [flow, partner, l1, l2] = k.split('|');
    rows.push({ period: year, reporter_code: r.reporterCode, flow, partner_code: +partner, commodity_l1: l1, commodity_l2: l2, value: Math.round(v * 100) / 100, volume: Math.round(q * 1000) / 1000 });
  }
  const { error: de } = await supabase.from('comtrade_flows').delete().eq('period', year).eq('reporter_code', r.reporterCode);
  if (de) throw de;
  const batches = [];
  for (let i = 0; i < rows.length; i += BATCH) batches.push(rows.slice(i, i + BATCH));
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < batches.length) {
        const { error } = await supabase.from('comtrade_flows').upsert(batches[next++], { onConflict: 'period,reporter_code,flow,partner_code,commodity_l1,commodity_l2' });
        if (error) throw error;
      }
    }),
  );
  return { status: 'loaded', conv: !!conv, info: `${read} rows read, ${kept} kept, ${unmapped} unmapped HS6 -> ${rows.length} flows` };
}

let loaded = 0;
for (const r of todo) {
  let out;
  try {
    out = await loadReporter(r);
  } catch (e) {
    out = { status: `error: ${String(e.message ?? e).slice(0, 120)}` };
  }
  console.log(`  ${r.reporterISO} ${out.status}${out.info ? ' - ' + out.info : ''}`);
  await supabase.from('comtrade_release_log').upsert({
    period: year,
    reporter_code: r.reporterCode,
    reporter_iso: r.reporterISO,
    classification: out.status === 'loaded' ? (out.conv ? `${r.classificationCode}->H5` : 'H5') : r.classificationCode,
    total_records: r.totalRecords,
    dataset_checksum: r.datasetChecksum,
    first_released: r.firstReleased + 'Z',
    last_released: r.lastReleased + 'Z',
    loaded_at: new Date().toISOString(),
    status: out.status,
  });
  if (out.status === 'loaded') loaded++;
}

if (!flag('no-rebuild') && (loaded || flag('force'))) {
  const { data, error } = await supabase.rpc('rebuild_provisional', { p_year: year });
  if (error) throw error;
  console.log('rebuild_provisional', JSON.stringify(data));
  const { error: re } = await supabase.rpc('queue_matview_refresh');
  if (re) throw re;
  console.log('matview refresh queued (runs ~8 min in the database)');
} else {
  console.log('nothing new; no rebuild');
}
