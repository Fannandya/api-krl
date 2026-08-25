'use strict';

const { Pool } = require('pg');
const { loadConfig } = require('./index');

let pool = null;

/**
 * Satu Pool per proses. Di Vercel setiap invocation adalah proses tersendiri,
 * jadi `max: 1` mencegah satu fungsi memakan banyak slot koneksi Supabase.
 * Gunakan connection string transaction pooler (port 6543).
 */
function getPool() {
  if (!pool) {
    const config = loadConfig();
    // Supabase mewajibkan TLS; Postgres lokal untuk pengembangan biasanya tidak
    // memakainya sama sekali, jadi SSL dimatikan khusus untuk host lokal.
    const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(config.databaseUrl);
    pool = new Pool({
      connectionString: config.databaseUrl,
      max: 1,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    });
    pool.on('error', (err) => console.error('Postgres pool error:', err));
  }
  return pool;
}

function query(text, params) {
  return getPool().query(text, params);
}

module.exports = { getPool, query };
