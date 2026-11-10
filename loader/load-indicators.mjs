// Load the curated BMI country indicators (Data/Indicators/*.csv from extract-indicators.py) into Supabase.
// Maps BMI "Geography" names to BACI country codes (countries table); unmatched names are listed and skipped.
// Usage: node load-indicators.mjs [--dry]
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
// BMI name -> name used in the countries table, for names that do not match after normalisation
const ALIAS = {
  'united states': 'United States of America', 'usa': 'United States of America', 'russia': 'Russian Federation',
  'south korea': 'Republic of Korea', 'korea, south': 'Republic of Korea', 'north korea': "Dem. People's Rep. of Korea",
  'iran': 'Iran', 'vietnam': 'Viet Nam', 'laos': "Lao People's Dem. Rep.", 'syria': 'Syria', 'turkey': 'Turkiye',
  'czech republic': 'Czechia', 'brunei': 'Brunei Darussalam', 'cape verde': 'Cabo Verde', 'ivory coast': "Cote d'Ivoire",
  'cote d ivoire': "Cote d'Ivoire", 'congo-brazzaville': 'Congo', 'congo-kinshasa': 'Dem. Rep. of the Congo',
  'democratic republic of the congo': 'Dem. Rep. of the Congo', 'republic of the congo': 'Congo', 'myanmar': 'Myanmar',
  'hong kong': 'China, Hong Kong SAR', 'macau': 'China, Macao SAR', 'taiwan': 'Taiwan', 'moldova': 'Rep. of Moldova',
  'bolivia': 'Bolivia (Plurinational State of)', 'venezuela': 'Venezuela', 'tanzania': 'United Rep. of Tanzania',
  'swaziland': 'Eswatini', 'macedonia': 'North Macedonia', 'gambia, the': 'Gambia', 'the gambia': 'Gambia', 'bahamas, the': 'Bahamas',
  'palestine': 'State of Palestine', 'kyrgyz republic': 'Kyrgyzstan', 'slovak republic': 'Slovakia', 'egypt': 'Egypt',
};

// BMI geography -> BACI num_code, for names that differ from the countries table.
// Not mapped (no BACI country of their own, skipped): Isle of Man, Kosovo, Liechtenstein, Puerto Rico, Virgin Islands U.S.
const DIRECT = {
  'Bosnia-Herzegovina': 70, 'China (Mainland)': 156, 'Congo-Brazzaville': 178, 'Hong Kong, China': 344, 'Macao, China': 446,
  'Micronesia, Federated States of': 583, 'North Korea': 408, 'South Korea': 410, 'Saint Kitts and Nevis': 659, 'Saint Lucia': 662,
  'Saint Vincent': 670, 'Sint Maarten': 534, 'Taiwan, China': 490, 'West Bank and Gaza': 275,
};

const countries = await fetchAll((a, b) => supabase.from('countries').select('num_code,country,country_short').order('num_code').range(a, b));
const byName = new Map();
for (const c of countries) { byName.set(norm(c.country), c.num_code); if (c.country_short) byName.set(norm(c.country_short), c.num_code); }

const catalog = read('indicator_catalog.csv');
const rows = read('country_indicators.csv');
const geos = [...new Set(rows.map((r) => r.geography))].sort();
const map = new Map(), unmatched = [];
for (const g of geos) {
  const n = norm(g);
  const id = DIRECT[g] ?? byName.get(n) ?? (ALIAS[n] ? byName.get(norm(ALIAS[n])) : undefined);
  if (id != null) map.set(g, id); else unmatched.push(g);
}
console.log(`${geos.length} BMI geographies: ${map.size} matched, ${unmatched.length} unmatched`);
if (unmatched.length) console.log('unmatched:', unmatched.join(' | '));
if (dry) process.exit(0);

await supabase.from('indicator_catalog').upsert(catalog.map((c) => ({ key: c.key, label: c.label, unit: c.unit, grp: c.grp, source_file: c.source_file, data_item: c.data_item })));
await supabase.from('bmi_country_map').upsert(geos.map((g) => ({ geography: g, country_id: map.get(g) ?? null })));

const out = [];
const seen = new Set();
for (const r of rows) {
  const id = map.get(r.geography);
  if (id == null) continue;
  const k = `${id}|${r.indicator}|${r.year}`;
  if (seen.has(k)) continue; // two BMI geographies mapped to one country: keep the first
  seen.add(k);
  out.push({ country_id: id, indicator: r.indicator, year: +r.year, value: +r.value, is_forecast: r.is_forecast === '1' });
}
await supabase.from('country_indicators').delete().neq('year', -1);
const B = 2000;
const batches = [];
for (let i = 0; i < out.length; i += B) batches.push(out.slice(i, i + B));
let next = 0, done = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (next < batches.length) {
    const { error } = await supabase.from('country_indicators').upsert(batches[next++], { onConflict: 'country_id,indicator,year' });
    if (error) throw error;
    done += B;
    process.stdout.write(`\r${Math.min(done, out.length)}/${out.length}`);
  }
}));
console.log(`\nloaded ${out.length} indicator values`);
