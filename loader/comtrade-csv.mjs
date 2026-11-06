// Build Data/CT_HS17_Y<year>.csv (BACI layout: t,i,j,k,v,q; v = thousand USD, q = tons) from UN Comtrade, for the Power BI refresh.
// Local only: per-reporter HS6 aggregates are cached in Data/ct_cache/<year>/ so reruns download only new/revised reporters.
// Same rule as rebuild_provisional(): exporter's own report (X) wins per exporter->importer pair, else importer mirror (M) x CIF factor.
// Usage: node comtrade-csv.mjs [--year 2025] [--force] [--cif 0.93]
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import zlib from 'node:zlib';
import readline from 'node:readline';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { fetchAll } from './lib.mjs';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, COMTRADE_KEY } = process.env;
const API = 'https://comtradeapi.un.org';
const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const dataDir = path.resolve(import.meta.dirname, '../Data');
// default year = first year after the latest BACI file (switches to 2026 once BACI_HS17_Y2025 is dropped in)
const lastBaci = Math.max(...fs.readdirSync(dataDir).map((f) => +(f.match(/^BACI_HS17_Y(\d{4})_/)?.[1] ?? 0)));
const year = Number(opt('year', lastBaci + 1));
const CIF = Number(opt('cif', 0.93)); // fallback when a commodity group has no calibrated factor
const force = args.includes('--force');
const cacheDir = path.join(dataDir, 'ct_cache', String(year));
const statePath = path.join(cacheDir, 'state.json');
fs.mkdirSync(cacheDir, { recursive: true });
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};

async function api(p, tries = 4) {
  for (let t = 1; ; t++) {
    const r = await fetch(API + p, { headers: { 'Ocp-Apim-Subscription-Key': COMTRADE_KEY } });
    if (r.ok) return r;
    if (t >= tries || (r.status < 500 && r.status !== 429)) throw new Error(`Comtrade ${r.status} ${p.split('?')[0]}`);
    await new Promise((res) => setTimeout(res, 2000 * t));
  }
}
const apiJson = async (p) => (await (await api(p)).json()).data ?? [];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const known = new Set((await fetchAll((a, b) => supabase.from('countries').select('num_code').order('num_code').range(a, b))).map((r) => r.num_code));

const l1Of = new Map((await fetchAll((a, b) => supabase.from('commodity_map').select('hs6,adpg_l1').order('hs6').range(a, b))).map((r) => [r.hs6, r.adpg_l1]));
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

const available = await apiJson(`/data/v1/getDA/C/A/HS?period=${year}`);
const todo = available.filter((r) => {
  const s = state[r.reporterCode];
  return force || !s || s.checksum !== r.datasetChecksum || s.released !== r.lastReleased;
});
console.log(`${year}: ${available.length} reporters published, ${todo.length} to download`);

async function download(r) {
  const files = await apiJson(`/bulk/v1/get/C/A/H5?reporterCode=${r.reporterCode}&period=${year}`);
  let f = files.find((x) => x.classificationCode === 'H5');
  let conv = null;
  if (!f) { // no converted file: as-reported HS2012/HS2007 mapped to HS2017 via the UNSD correlation tables (hs_conversion)
    const ed = r.classificationCode;
    if (ed !== 'H3' && ed !== 'H4') return `no_H5_edition (${ed})`;
    f = (await apiJson(`/bulk/v1/get/C/A/${ed}?reporterCode=${r.reporterCode}&period=${year}`)).find((x) => x.classificationCode === ed);
    if (!f) return 'no_file';
    conv = await conversion(ed);
  }
  const res = await api(f.fileUrl.replace(API, ''));
  const rl = readline.createInterface({ input: Readable.fromWeb(res.body).pipe(zlib.createGunzip()), crlfDelay: Infinity });
  let col = null;
  const agg = new Map();
  for await (const line of rl) {
    const p = line.split('\t');
    if (!col) { col = Object.fromEntries(p.map((n, i) => [n, i])); continue; }
    const flow = p[col.flowCode];
    if (flow !== 'M' && flow !== 'X') continue;
    if (p[col.partner2Code] !== '0' || p[col.customsCode] !== 'C00' || p[col.motCode] !== '0') continue;
    const hs = p[col.cmdCode];
    const partner = +p[col.partnerCode];
    if (hs.length !== 6 || !partner) continue;
    for (const [h17, share] of conv ? (conv.get(hs) ?? []) : [[hs, 1]]) {
      const key = `${flow},${partner},${h17}`;
      const e = agg.get(key) ?? [0, 0];
      e[0] += (+p[col.primaryValue] || 0) * share;
      e[1] += (+p[col.netWgt] || 0) * share;
      agg.set(key, e);
    }
  }
  const out = [];
  for (const [k, [v, q]] of agg) out.push(`${k},${v},${q}`);
  fs.writeFileSync(path.join(cacheDir, `${r.reporterCode}.csv`), out.join('\n') + '\n');
  return 'ok';
}

for (const r of todo) {
  let status;
  try { status = await download(r); } catch (e) { status = `error: ${String(e.message ?? e).slice(0, 100)}`; }
  console.log(`  ${r.reporterISO} ${status}`);
  if (status === 'ok') state[r.reporterCode] = { checksum: r.datasetChecksum, released: r.lastReleased, iso: r.reporterISO };
  fs.writeFileSync(statePath, JSON.stringify(state));
}

// merge cache -> CSV (X rows first; M rows only for pairs without an X report)
const reporters = Object.keys(state).map(Number);
const readRows = async function* (rep) {
  const rl = readline.createInterface({ input: fs.createReadStream(path.join(cacheDir, `${rep}.csv`)), crlfDelay: Infinity });
  for await (const line of rl) if (line) { const [flow, partner, hs, v, q] = line.split(','); yield { flow, partner: +partner, hs, v: +v, q: +q }; }
};
const xPairs = new Set(); // exporter*1000+importer
for (const rep of reporters) for await (const x of readRows(rep)) if (x.flow === 'X') xPairs.add(rep * 1000 + x.partner);

const factors = new Map((await fetchAll((a, b) => supabase.from('mirror_factor').select('commodity_l1,factor').eq('period', year).order('commodity_l1').range(a, b))).map((r) => [r.commodity_l1, +r.factor]));
console.log(`mirror factors: ${factors.size} calibrated groups (fallback ${CIF})`);
const outPath = path.join(dataDir, `CT_HS17_Y${year}.csv`);
const tmpPath = outPath + '.tmp';
const ws = fs.createWriteStream(tmpPath);
ws.write('t,i,j,k,v,q\n');
let rows = 0, total = 0;
for (const rep of reporters) {
  for await (const x of readRows(rep)) {
    let i, j, v;
    if (x.flow === 'X') { i = rep; j = x.partner; v = x.v; }
    else { i = x.partner; j = rep; if (xPairs.has(i * 1000 + j)) continue; v = x.v * (factors.get(l1Of.get(x.hs)) ?? CIF); }
    if (i === j || !(v > 0) || !known.has(i) || !known.has(j)) continue;
    if (!ws.write(`${year},${i},${j},${x.hs},${(v / 1000).toFixed(3)},${(x.q / 1000).toFixed(3)}\n`)) await new Promise((r) => ws.once('drain', r));
    rows++; total += v;
  }
}
await new Promise((r) => ws.end(r));
fs.renameSync(tmpPath, outPath);
console.log(`wrote ${path.basename(outPath)}: ${rows} rows, total ${(total / 1e9).toFixed(1)} bn USD, ${reporters.length} reporters`);
