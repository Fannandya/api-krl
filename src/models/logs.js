'use strict';

const { query } = require('../config/database');
const { DAY_START_SQL } = require('../config/time');

async function insertRequestLog({ apiKeyId, endpoint, method, statusCode, latencyMs, ip }) {
  await query(
    `INSERT INTO request_logs (api_key_id, endpoint, method, status_code, latency_ms, ip)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [apiKeyId, endpoint, method, statusCode, latencyMs, ip || null]
  );
}

/**
 * Pemakaian harian seluruh API key milik satu pengguna selama N hari terakhir.
 * generate_series dipakai supaya hari tanpa permintaan tetap muncul sebagai
 * nol; tanpa itu grafik di dashboard akan bolong dan menyesatkan.
 */
async function getDailyUsageForUser({ userId, days = 7 }) {
  const { rows } = await query(
    `WITH hari AS (
       SELECT generate_series(
         ${DAY_START_SQL} - make_interval(days => $2 - 1),
         ${DAY_START_SQL},
         interval '1 day'
       ) AS tanggal
     )
     SELECT to_char(h.tanggal AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS date,
            COUNT(rl.id)::int                AS requests,
            COALESCE(ROUND(AVG(rl.latency_ms))::int, 0) AS avg_latency_ms,
            COUNT(rl.id) FILTER (WHERE rl.status_code >= 400)::int AS errors
     FROM hari h
     LEFT JOIN request_logs rl
            ON rl.created_at >= h.tanggal
           AND rl.created_at <  h.tanggal + interval '1 day'
           AND rl.api_key_id IN (SELECT id FROM api_keys WHERE user_id = $1)
     GROUP BY h.tanggal
     ORDER BY h.tanggal`,
    [userId, days]
  );
  return rows;
}

/** Endpoint yang paling sering dipanggil oleh seorang pengguna. */
async function getTopEndpointsForUser({ userId, limit = 5 }) {
  const { rows } = await query(
    `SELECT rl.endpoint, COUNT(*)::int AS requests,
            ROUND(AVG(rl.latency_ms))::int AS avg_latency_ms
     FROM request_logs rl
     JOIN api_keys k ON k.id = rl.api_key_id
     WHERE k.user_id = $1
     GROUP BY rl.endpoint
     ORDER BY requests DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

async function getRecentLogsForKey({ apiKeyId, limit = 50 }) {
  const { rows } = await query(
    `SELECT endpoint, method, status_code, latency_ms, created_at
     FROM request_logs
     WHERE api_key_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [apiKeyId, limit]
  );
  return rows;
}

module.exports = {
  insertRequestLog,
  getDailyUsageForUser,
  getTopEndpointsForUser,
  getRecentLogsForKey,
};
