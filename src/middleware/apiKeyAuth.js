'use strict';

const { ApiError } = require('../errors');
const { hashApiKey } = require('../services/apiKey');
const { findActiveApiKeyByHash, touchLastUsed } = require('../models/apiKeys');

/**
 * Autentikasi untuk endpoint data. Berbeda dari JWT: ini dipakai mesin, bukan
 * manusia, sehingga kredensialnya berumur panjang dan bisa dicabut kapan saja.
 *
 * API key hanya diterima lewat header X-API-Key. Header Authorization sudah
 * menjadi milik token JWT sejak endpoint data mewajibkan sesi yang masuk, jadi
 * membacanya di sini hanya akan membuat token login dilaporkan sebagai "API key
 * tidak dikenali".
 */
async function requireApiKey(req, res, next) {
  const raw = req.get('x-api-key');

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

/**
 * Pastikan API key yang dipakai memang milik akun yang sedang masuk. Tanpa ini
 * sebuah key yang bocor masih bisa dipakai bersama sesi akun mana pun, dan
 * kuotanya terhitung ke pemilik yang keliru.
 *
 * Dipasang sesudah requireJwt dan requireApiKey, jadi req.user dan req.apiKey
 * dijamin sudah terisi.
 */
function requireApiKeyOwner(req, res, next) {
  if (req.apiKey.userId !== req.user.id) {
    return next(ApiError.forbidden('API key ini bukan milik akun yang sedang masuk.'));
  }
  return next();
}

module.exports = { requireApiKey, requireApiKeyOwner };
