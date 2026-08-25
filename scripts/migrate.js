'use strict';

const fs = require('fs');
const path = require('path');
const { getPool } = require('../src/config/database');

const SCHEMA = path.join(__dirname, '..', 'db', 'schema.sql');
const SEED = path.join(__dirname, '..', 'db', 'seed.sql');

const COUNT_TABLES = [
  'plans', 'users', 'api_keys', 'request_logs',
  'stations', 'lines', 'line_stations', 'service_patterns', 'fare_rules',
];

async function main() {
  const pool = getPool();
  const withSeed = !process.argv.includes('--schema-only');

  console.log('Menjalankan db/schema.sql ...');
  await pool.query(fs.readFileSync(SCHEMA, 'utf8'));

  if (withSeed) {
    console.log('Menjalankan db/seed.sql ...');
    await pool.query(fs.readFileSync(SEED, 'utf8'));
  }

  console.log('\nJumlah baris per tabel:');
  let total = 0;
  for (const table of COUNT_TABLES) {
    const { rows } = await pool.query(`SELECT count(*)::int AS n FROM ${table}`);
    total += rows[0].n;
    console.log(`  ${table.padEnd(18)} ${String(rows[0].n).padStart(5)}`);
  }
  console.log(`  ${'TOTAL'.padEnd(18)} ${String(total).padStart(5)}`);

  await pool.end();
}

main().catch((err) => {
  console.error('Migrasi gagal:', err.message);
  process.exit(1);
});
