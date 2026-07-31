import fs from 'node:fs';
import path from 'node:path';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const year = Number(process.argv[2]);
const csvPath = process.argv[3];

if (!year || !csvPath) {
  console.error('Usage: node load-year.mjs <year> <csv-path>');
  process.exit(1);
}
if (!fs.existsSync(csvPath)) {
  console.error(`File not found: ${csvPath}`);
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function toNum(v) {
  if (v === undefined || v === null || v === '') return null;
  const cleaned = String(v).replace(/,/g, '').replace(/"/g, '').trim();
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

async function main() {
  console.log(`Parsing ${csvPath}...`);
  const raw = fs.readFileSync(csvPath, 'utf8').replace(/^﻿/, '');
  const parsed = Papa.parse(raw, { header: true, skipEmptyLines: true });
  if (parsed.errors?.length) {
    console.warn(`CSV parse warnings: ${parsed.errors.length} (showing first 3)`);
    console.warn(parsed.errors.slice(0, 3));
  }

  const rows = parsed.data
    .map((r) => ({
      year,
      exporter_id: toNum(r.exporter_id),
      importer_id: toNum(r.importer_id),
      commodity_l1: r.adpg_level_1,
      commodity_l2: r.adpg_level_2,
      volume: toNum(r.Volume),
      value: toNum(r.Value),
    }))
    .filter((r) => r.exporter_id !== null && r.importer_id !== null && r.commodity_l1 && r.commodity_l2);

  console.log(`Parsed ${parsed.data.length} rows, ${rows.length} usable.`);

  console.log(`Deleting existing rows for year ${year} (idempotent reload)...`);
  const { error: delErr } = await supabase.from('baci_trade').delete().eq('year', year);
  if (delErr) {
    console.error('Delete failed:', delErr);
    process.exit(1);
  }

  const BATCH = 2000;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('baci_trade')
      .upsert(batch, { onConflict: 'year,exporter_id,importer_id,commodity_l1,commodity_l2' });
    if (error) {
      console.error(`\nBatch failed at row ${i}:`, error);
      process.exit(1);
    }
    inserted += batch.length;
    process.stdout.write(`\rInserted ${inserted}/${rows.length}`);
  }
  console.log('');

  const { error: logErr } = await supabase
    .from('load_log')
    .upsert(
      { year, source_file: path.basename(csvPath), row_count: rows.length, loaded_at: new Date().toISOString() },
      { onConflict: 'year' }
    );
  if (logErr) console.error('load_log upsert failed:', logErr);

  console.log(`Done. Loaded ${rows.length} rows for year ${year}.`);
}

main();
