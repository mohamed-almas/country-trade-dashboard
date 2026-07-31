import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const dataDir = path.resolve(import.meta.dirname, '../Data');
const files = fs
  .readdirSync(dataDir)
  .filter((f) => /^baci_(\d{4})\.csv$/.test(f))
  .sort();

for (const f of files) {
  const year = f.match(/^baci_(\d{4})\.csv$/)[1];
  console.log(`\n=== Loading ${year} (${f}) ===`);
  const result = spawnSync('node', ['load-year.mjs', year, path.join(dataDir, f)], {
    cwd: import.meta.dirname,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    console.error(`Failed loading ${year}, stopping.`);
    process.exit(1);
  }
}
console.log('\nBackfill complete.');
