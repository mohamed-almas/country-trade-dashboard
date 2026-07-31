import fs from 'node:fs';
import path from 'node:path';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const dataDir = path.resolve(import.meta.dirname, '../Data');
const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.csv'));

const allIds = new Set();
for (const f of files) {
  const raw = fs.readFileSync(path.join(dataDir, f), 'utf8').replace(/^﻿/, '');
  const parsed = Papa.parse(raw, { header: true, skipEmptyLines: true });
  for (const r of parsed.data) {
    if (r.exporter_id) allIds.add(Number(r.exporter_id));
    if (r.importer_id) allIds.add(Number(r.importer_id));
  }
  console.log(`${f}: ${parsed.data.length} rows parsed`);
}

console.log(`Total distinct exporter/importer ids across all files: ${allIds.size}`);

const { data: known, error } = await supabase.from('countries').select('num_code');
if (error) throw error;
const knownSet = new Set(known.map((k) => k.num_code));

const missing = [...allIds].filter((id) => !knownSet.has(id)).sort((a, b) => a - b);
console.log(`Missing from countries table: ${missing.length}`);
console.log(missing);
