'use strict';

const { ApiError } = require('../errors');
const { hashApiKey } = require('../services/apiKey');
const { findActiveApiKeyByHash, touchLastUsed } = require('../models/apiKeys');

/**
 * Autentikasi untuk endpoint data. Berbeda dari JWT: ini dipakai mesin, bukan
 * manusia, sehingga kredensialnya berumur panjang dan bisa dicabut kapan saja.
 *
 * API key diterima lewat header X-API-Key, atau lewat Authorization: Bearer
 * untuk klien yang hanya mengenal cara itu.
 */
async function requireApiKey(req, res, next) {
  const header = req.get('x-api-key');
  const authorization = req.get('authorization');
  const raw = header
    || (authorization && authorization.toLowerCase().startsWith('bearer ')
      ? authorization.slice(7).trim()
      : null);

  if (!raw) {
    return next(ApiError.unauthorized(
      'API key wajib disertakan pada header X-API-Key. Buat API key di dashboard.'
    ));
  }

  try {
    const record = await findActiveApiKeyByHash(hashApiKey(raw));

    if (!record) {
      return next(ApiError.unauthorized('API key tidak dikenali.'));
    }
    if (record.revoked_at) {
      return next(ApiError.unauthorized('API key ini sudah dicabut.'));
    }

    req.apiKey = {
      id: record.id,
      userId: record.user_id,
      name: record.name,
      prefix: record.key_prefix,
      usedToday: record.used_today,
    };
    req.plan = {
      code: record.plan_code,
      name: record.plan_name,
      dailyQuota: record.daily_quota,
      rateLimitPerMinute: record.rate_limit_per_minute,
    };

    // Penanda waktu pemakaian tidak perlu ditunggu: kegagalannya tidak boleh
    // menggagalkan permintaan yang sebenarnya sudah sah.
    touchLastUsed(record.id).catch((err) =>
      console.error('Gagal memperbarui last_used_at:', err.message));

    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { requireApiKey };
