'use strict';

const { ApiError } = require('../errors');
const { nextQuotaReset } = require('../config/time');

/**
 * Penegakan kuota harian. Jumlah pemakaian hari ini sudah ikut terambil oleh
 * apiKeyAuth, jadi tidak ada kueri tambahan di sini.
 */
function enforceQuota(req, res, next) {
  const { dailyQuota } = req.plan;
  const used = req.apiKey.usedToday;
  const remaining = Math.max(0, dailyQuota - used);
  const reset = nextQuotaReset();

  res.set('X-RateLimit-Limit', String(dailyQuota));
  res.set('X-RateLimit-Remaining', String(remaining));
  res.set('X-RateLimit-Reset', reset.toISOString());

  if (used >= dailyQuota) {
    return next(ApiError.quotaExceeded(
      `Kuota harian paket ${req.plan.name} sudah habis.`,
      {
        limit: dailyQuota,
        used,
        reset_at: reset.toISOString(),
        upgrade_hint: req.plan.code === 'free'
          ? 'Naikkan ke paket Pro untuk 50.000 permintaan per hari.'
          : undefined,
      }
    ));
  }

  return next();
}

module.exports = { enforceQuota };
