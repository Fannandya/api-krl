'use strict';

const { query } = require('../config/database');
const { DAY_START_SQL } = require('../config/time');

async function listPlans() {
  const { rows } = await query(
    `SELECT id, code, name, daily_quota, rate_limit_per_minute, price_idr, description
     FROM plans ORDER BY price_idr`
  );
  return rows;
}

async function findPlanByCode(code) {
  const { rows } = await query(`SELECT * FROM plans WHERE code = $1`, [code]);
  return rows[0] || null;
}

async function createApiKey({ userId, planId, name, keyHash, keyPrefix }) {
  const { rows } = await query(
    `INSERT INTO api_keys (user_id, plan_id, name, key_hash, key_prefix)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, key_prefix, created_at`,
    [userId, planId, name, keyHash, keyPrefix]
  );
  return rows[0];
}

/**
 * Daftar API key milik satu pengguna, lengkap dengan pemakaian hari ini.
 * Pemakaian dihitung lewat subquery berkorelasi yang memanfaatkan indeks
 * (api_key_id, created_at).
 */
async function listApiKeysForUser(userId) {
  const { rows } = await query(
    `SELECT k.id, k.name, k.key_prefix, k.created_at, k.last_used_at, k.revoked_at,
            p.code AS plan_code, p.name AS plan_name, p.daily_quota,
            (SELECT COUNT(*)::int FROM request_logs rl
             WHERE rl.api_key_id = k.id AND rl.created_at >= ${DAY_START_SQL}) AS used_today,
            (SELECT COUNT(*)::int FROM request_logs rl WHERE rl.api_key_id = k.id) AS used_total
     FROM api_keys k
     JOIN plans p ON p.id = k.plan_id
     WHERE k.user_id = $1
     ORDER BY k.created_at DESC`,
    [userId]
  );
  return rows;
}

async function findApiKeyById({ id, userId }) {
  const { rows } = await query(
    `SELECT k.*, p.code AS plan_code, p.name AS plan_name, p.daily_quota
     FROM api_keys k JOIN plans p ON p.id = k.plan_id
     WHERE k.id = $1 AND k.user_id = $2`,
    [id, userId]
  );
  return rows[0] || null;
}

/**
 * Cari API key berdasarkan hash-nya, sekaligus ambil kuota paket dan pemakaian
 * hari berjalan dalam satu perjalanan ke basis data. Menyatukan tiga hal ini
 * menghemat dua kali bolak-balik jaringan pada setiap permintaan API, yang
 * terasa besar di lingkungan serverless.
 */
async function findActiveApiKeyByHash(keyHash) {
  const { rows } = await query(
    `SELECT k.id, k.user_id, k.name, k.key_prefix, k.revoked_at,
            p.code AS plan_code, p.name AS plan_name,
            p.daily_quota, p.rate_limit_per_minute,
            (SELECT COUNT(*)::int FROM request_logs rl
             WHERE rl.api_key_id = k.id AND rl.created_at >= ${DAY_START_SQL}) AS used_today
     FROM api_keys k
     JOIN plans p ON p.id = k.plan_id
     WHERE k.key_hash = $1`,
    [keyHash]
  );
  return rows[0] || null;
}

async function revokeApiKey({ id, userId }) {
  const { rows } = await query(
    `UPDATE api_keys SET revoked_at = now()
     WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
     RETURNING id, name, revoked_at`,
    [id, userId]
  );
  return rows[0] || null;
}

async function touchLastUsed(apiKeyId) {
  await query(`UPDATE api_keys SET last_used_at = now() WHERE id = $1`, [apiKeyId]);
}

module.exports = {
  listPlans,
  findPlanByCode,
  createApiKey,
  listApiKeysForUser,
  findApiKeyById,
  findActiveApiKeyByHash,
  revokeApiKey,
  touchLastUsed,
};
