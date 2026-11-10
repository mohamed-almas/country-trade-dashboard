// Load commodity supply/demand/trade series (Data/Indicators/commodity_balance.csv from extract-commodity-balance.py) into Supabase.
// Country names are mapped through bmi_country_map (filled by load-indicators.mjs). Usage: node load-commodity-balance.mjs
import fs from 'node:fs';
import path from 'node:path';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { fetchAll } from './lib.mjs';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const dir = path.resolve(import.meta.dirname, '../Data/Indicators');
const read = (f) => Papa.parse(fs.readFileSync(path.join(dir, f), 'utf8'), { header: true, skipEmptyLines: true }).data;

const map = new Map((await fetchAll((a, b) => supabase.from('bmi_country_map').select('geography,country_id').order('geography').range(a, b))).map((r) => [r.geography, r.country_id]));
const catalog = read('commodity_catalog.csv');
const rows = read('commodity_balance.csv');

const { error: ce } = await supabase.from('commodity_catalog').upsert(catalog.map((c) => ({ commodity: c.commodity, label: c.label, unit: c.unit, adpg_l1: c.adpg_l1 || null, adpg_l2: c.adpg_l2 || null })));
if (ce) throw ce;

const out = [], seen = new Set(), unmapped = new Set();
for (const r of rows) {
  const id = map.get(r.geography);
  if (id == null) { unmapped.add(r.geography); continue; }
  const k = `${id}|${r.commodity}|${r.measure}|${r.year}`;
  if (seen.has(k)) continue;
  seen.add(k);
  out.push({ country_id: id, commodity: r.commodity, measure: r.measure, year: +r.year, value: +r.value, is_forecast: r.is_forecast === '1' });
}
if (unmapped.size) console.log('skipped geographies (no BACI country):', [...unmapped].join(' | '));
await supabase.from('commodity_balance').delete().neq('year', -1);
const B = 2000, batches = [];
for (let i = 0; i < out.length; i += B) batches.push(out.slice(i, i + B));
let next = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (next < batches.length) {
    const { error } = await supabase.from('commodity_balance').upsert(batches[next++], { onConflict: 'country_id,commodity,measure,year' });
    if (error) throw error;
  }
}));
console.log(`loaded ${out.length} commodity balance values`);
