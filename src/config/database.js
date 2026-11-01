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
    const useSsl = process.env.DB_SSL === 'true';
    const poolMax = Number(process.env.DB_POOL_MAX || 10);
    pool = new Pool({
      connectionString: config.databaseUrl,
      max: poolMax,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    });
    pool.on('error', (err) => console.error('Postgres pool error:', err));
  }
  return pool;
}

function query(text, params) {
  return getPool().query(text, params);
}

module.exports = { getPool, query };
