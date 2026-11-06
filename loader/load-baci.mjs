// Load original CEPII BACI files (BACI_HS17_Y<year>_V<release>.csv) into baci_trade.
// Streams the CSV, maps HS6 -> ADPG L1/L2 (commodity_map), aggregates to exporter/importer/L1/L2,
// then replaces that year's rows. value: thousand USD -> USD. volume: metric tons.
// Usage: node load-baci.mjs [year ...]   (no args = every BACI_HS17_Y*.csv in ../Data)
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { fetchAll } from './lib.mjs';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const dataDir = path.resolve(import.meta.dirname, '../Data');
const BATCH = 2000;
const CONCURRENCY = 4;

const want = new Set(process.argv.slice(2).map(Number));
const files = fs
  .readdirSync(dataDir)
  .map((f) => f.match(/^BACI_HS17_Y(\d{4})_V\d+\.csv$/))
  .filter(Boolean)
  .map((m) => ({ year: Number(m[1]), file: path.join(dataDir, m[0]) }))
  .filter((f) => !want.size || want.has(f.year))
  .sort((a, b) => a.year - b.year);
if (!files.length) { console.error('no BACI files found'); process.exit(1); }

const map = new Map(
  (await fetchAll((a, b) => supabase.from('commodity_map').select('hs6,adpg_l1,adpg_l2').order('hs6').range(a, b))).map((r) => [r.hs6, r]),
);
const known = new Set((await fetchAll((a, b) => supabase.from('countries').select('num_code').order('num_code').range(a, b))).map((r) => r.num_code));
console.log(`mapping ${map.size} HS6 codes, ${known.size} countries`);

async function loadYear({ year, file }) {
  const agg = new Map();
  const badHs = new Set();
  const badCountry = new Set();
  let n = 0;
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  let first = true;
  for await (const line of rl) {
    if (first) { first = false; continue; }
    const p = line.split(',');
    if (p.length < 6) continue;
    const i = +p[1], j = +p[2];
    const m = map.get(p[3].padStart(6, '0'));
    if (!m) { badHs.add(p[3]); continue; }
    if (!known.has(i)) badCountry.add(i);
    if (!known.has(j)) badCountry.add(j);
    const key = `${i}|${j}|${m.adpg_l1}|${m.adpg_l2}`;
    const e = agg.get(key) ?? [0, 0];
    e[0] += (+p[4] || 0) * 1000;
    e[1] += +p[5] || 0;
    agg.set(key, e);
    if (++n % 2_000_000 === 0) process.stdout.write(`\r  ${year}: ${n / 1e6}M rows read`);
  }
  console.log(`\r  ${year}: ${n} rows read -> ${agg.size} aggregated`);
  if (badHs.size) throw new Error(`${year}: HS6 codes missing from commodity_map: ${[...badHs].slice(0, 20)}`);
  if (badCountry.size) throw new Error(`${year}: country codes missing from countries: ${[...badCountry]}`);

  const rows = [];
  for (const [k, [v, q]] of agg) {
    const [i, j, l1, l2] = k.split('|');
    rows.push({ year, exporter_id: +i, importer_id: +j, commodity_l1: l1, commodity_l2: l2, value: Math.round(v * 100) / 100, volume: Math.round(q * 1000) / 1000, source: 'BACI' });
  }

  const { error: delErr } = await supabase.from('baci_trade').delete().eq('year', year);
  if (delErr) throw delErr;
  let done = 0;
  const batches = [];
  for (let i = 0; i < rows.length; i += BATCH) batches.push(rows.slice(i, i + BATCH));
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < batches.length) {
        const b = batches[next++];
        const { error } = await supabase.from('baci_trade').upsert(b, { onConflict: 'year,exporter_id,importer_id,commodity_l1,commodity_l2' });
        if (error) throw error;
        done += b.length;
        process.stdout.write(`\r  ${year}: inserted ${done}/${rows.length}`);
      }
    }),
  );
  console.log('');
  // BACI now covers this year: drop its provisional Comtrade staging data
  await supabase.from('comtrade_flows').delete().eq('period', year);
  await supabase.from('comtrade_release_log').delete().eq('period', year);
  await supabase.from('load_log').upsert({ year, source_file: path.basename(file), row_count: rows.length, loaded_at: new Date().toISOString() }, { onConflict: 'year' });
}

for (const f of files) {
  console.log(`== ${f.year} (${path.basename(f.file)})`);
  await loadYear(f);
}
console.log('queueing materialized view refresh...');
const { error: refreshErr } = await supabase.rpc('queue_matview_refresh');
if (refreshErr) throw refreshErr;
console.log('done');
