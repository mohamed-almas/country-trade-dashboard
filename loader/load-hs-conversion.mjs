// Load HS2012 (H4) / HS2007 (H3) -> HS2017 conversion shares into Supabase (hs_conversion), from the UNSD correlation tables
// exported by export-hs-corr.py. One-to-many splits are weighted by each HS2017 code's world value in the latest BACI year.
// Usage: node load-hs-conversion.mjs
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const dir = path.resolve(import.meta.dirname, '../Data');
const ref = path.join(dir, 'References');

const baci = fs.readdirSync(dir).filter((f) => /^BACI_HS17_Y\d{4}_/.test(f)).sort().pop();
console.log('weights from', baci);
const w = new Map();
let first = true;
for await (const line of readline.createInterface({ input: fs.createReadStream(path.join(dir, baci)), crlfDelay: Infinity })) {
  if (first) { first = false; continue; }
  const p = line.split(',');
  const k = p[3].padStart(6, '0');
  w.set(k, (w.get(k) ?? 0) + (+p[4] || 0));
}

for (const ed of ['H4', 'H3']) {
  const pairs = fs.readFileSync(path.join(ref, `hs_corr_${ed}.csv`), 'utf8').trim().split(/\r?\n/).slice(1).map((l) => l.split(','));
  const byFrom = new Map();
  for (const [f, t] of pairs) (byFrom.get(f) ?? byFrom.set(f, []).get(f)).push(t);
  const rows = [];
  for (const [f, ts] of byFrom) {
    const tot = ts.reduce((s, t) => s + (w.get(t) ?? 0), 0);
    for (const t of ts) rows.push({ edition: ed, from_hs6: f, to_hs6: t, share: tot > 0 ? (w.get(t) ?? 0) / tot : 1 / ts.length });
  }
  await supabase.from('hs_conversion').delete().eq('edition', ed);
  for (let i = 0; i < rows.length; i += 2000) {
    const { error } = await supabase.from('hs_conversion').insert(rows.slice(i, i + 2000));
    if (error) throw error;
  }
  console.log(ed, byFrom.size, 'source codes,', rows.length, 'rows');
}
