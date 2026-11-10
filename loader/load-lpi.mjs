// Load World Bank LPI (Data/Indicators/lpi_scores.csv, lpi20.csv from extract-lpi.py) into Supabase, mapping World Bank country names to BACI codes.
// Usage: node load-lpi.mjs [--dry]   (--dry lists unmatched names only)
import fs from 'node:fs';
import path from 'node:path';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { fetchAll } from './lib.mjs';

const dry = process.argv.includes('--dry');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const dir = path.resolve(import.meta.dirname, '../Data/Indicators');
const read = (f) => Papa.parse(fs.readFileSync(path.join(dir, f), 'utf8'), { header: true, skipEmptyLines: true }).data;
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();

// World Bank ISO3 -> BACI num_code for names that do not match the countries table after normalisation.
// Not mapped (aggregates, or no BACI country of their own) are skipped and listed.
const DIRECT = {
  BHS: 44, COD: 180, COG: 178, CZE: 203, EGY: 818, GMB: 270, HKG: 344, IRN: 364, KGZ: 417, KOR: 410, LAO: 418, RUS: 643, SOM: 706, SVK: 703,
  SYR: 760, TWN: 490, USA: 842, VEN: 862, YEM: 887, CPV: 132, MAC: 446, VGB: 92, WLF: 876, PSE: 275, NRU: 520, FSM: 583, BES: 535,
};
// skipped: regional/income aggregates, Yugoslavia, Kosovo, Liechtenstein, Puerto Rico, US Virgin Islands, Jersey, Faroe Islands, French Guiana, Guadeloupe, Martinique, Reunion

const countries = await fetchAll((a, b) => supabase.from('countries').select('num_code,country,country_short').order('num_code').range(a, b));
const byName = new Map();
for (const c of countries) { byName.set(norm(c.country), c.num_code); if (c.country_short) byName.set(norm(c.country_short), c.num_code); }

const scores = read('lpi_scores.csv');
const l20 = read('lpi20.csv');
const labels = new Map();
for (const r of [...scores, ...l20]) labels.set(r.iso3, r.label);
const map = new Map(), unmatched = [];
for (const [iso, label] of labels) {
  const id = DIRECT[iso] ?? byName.get(norm(label));
  if (id != null) map.set(iso, id); else unmatched.push(`${iso} (${label})`);
}
console.log(`${labels.size} World Bank areas: ${map.size} matched, ${unmatched.length} unmatched`);
if (unmatched.length) console.log('unmatched:', unmatched.join(' | '));
if (dry) process.exit(0);

const s = [], seenS = new Set();
for (const r of scores) {
  const id = map.get(r.iso3); if (id == null) continue;
  const k = `${id}|${r.year}|${r.indicator}`; if (seenS.has(k)) continue; seenS.add(k);
  s.push({ country_id: id, year: +r.year, indicator: r.indicator, score: r.score === '' ? null : +r.score, rank: r.rank === '' ? null : +r.rank });
}
const t = [], seenT = new Set();
for (const r of l20) {
  const id = map.get(r.iso3); if (id == null) continue;
  const k = `${id}|${r.year}|${r.indicator}|${r.metric}`; if (seenT.has(k)) continue; seenT.add(k);
  t.push({ country_id: id, year: +r.year, indicator: r.indicator, metric: r.metric, value: +r.value });
}
async function load(table, rows, conflict) {
  await supabase.from(table).delete().neq('year', -1);
  for (let i = 0; i < rows.length; i += 2000) {
    const { error } = await supabase.from(table).upsert(rows.slice(i, i + 2000), { onConflict: conflict });
    if (error) throw error;
  }
  console.log(`loaded ${rows.length} rows into ${table}`);
}
await load('lpi_scores', s, 'country_id,year,indicator');
await load('lpi20', t, 'country_id,year,indicator,metric');
