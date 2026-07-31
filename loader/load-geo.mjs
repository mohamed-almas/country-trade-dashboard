import fs from 'node:fs';
import path from 'node:path';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in loader/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const csvPath = process.argv[2] || path.resolve(import.meta.dirname, '../ml_baci_geo.csv');

function toNum(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function main() {
  const raw = fs.readFileSync(csvPath, 'utf8').replace(/^﻿/, '');
  const parsed = Papa.parse(raw, { header: true, skipEmptyLines: true });
  if (parsed.errors?.length) {
    console.warn(`CSV parse warnings: ${parsed.errors.length} (showing first 3)`);
    console.warn(parsed.errors.slice(0, 3));
  }

  const rows = parsed.data
    .map((r) => ({
      num_code: toNum(r['num_code']),
      country: r['Country'],
      country_short: r['Country Short Name'],
      continent: r['Continent'],
      continent_code: r['Continent Code'],
      region_un: r['Region (UN)'],
      subregion_un: r['Sub-region (UN)'],
      income_group: r['Income group (WB)'],
      lat: toNum(r['Lat']),
      long: toNum(r['Long']),
    }))
    .filter((r) => r.num_code !== null && r.country);

  console.log(`Parsed ${parsed.data.length} rows, ${rows.length} usable (have num_code + country)`);

  const { error } = await supabase.from('countries').upsert(rows, { onConflict: 'num_code' });
  if (error) {
    console.error('Upsert failed:', error);
    process.exit(1);
  }

  console.log(`Loaded ${rows.length} countries into 'countries' table.`);
}

main();
