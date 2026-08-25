'use strict';

const { ApiError } = require('../errors');
const { generateApiKey, maskApiKey } = require('../services/apiKey');
const {
  listPlans, findPlanByCode, createApiKey, listApiKeysForUser,
  findApiKeyById, revokeApiKey,
} = require('../models/apiKeys');
const { getRecentLogsForKey, getDailyUsageForUser } = require('../models/logs');

const MAX_KEYS_PER_USER = 10;

function presentKey(row) {
  return {
    id: row.id,
    name: row.name,
    key_prefix: row.key_prefix,
    masked: maskApiKey(row.key_prefix),
    plan: { code: row.plan_code, name: row.plan_name, daily_quota: row.daily_quota },
    usage: {
      used_today: row.used_today,
      used_total: row.used_total,
      remaining_today: Math.max(0, row.daily_quota - row.used_today),
    },
    created_at: row.created_at,
    last_used_at: row.last_used_at,
    revoked_at: row.revoked_at,
    status: row.revoked_at ? 'revoked' : 'active',
  };
}

/** GET /keys */
exports.list = async (req, res) => {
  const keys = await listApiKeysForUser(req.user.id);
  return res.json({ data: keys.map(presentKey), meta: { count: keys.length } });
};

/** GET /keys/plans — paket yang tersedia saat membuat API key. */
exports.plans = async (req, res) => {
  return res.json({ data: await listPlans() });
};

/** GET /keys/usage — ringkasan pemakaian seluruh API key untuk grafik dashboard. */
exports.usage = async (req, res) => {
  const days = Math.min(30, Math.max(1, Number(req.query.days) || 7));
  return res.json({ data: await getDailyUsageForUser({ userId: req.user.id, days }) });
};

/**
 * POST /keys
 * Nilai API key yang sesungguhnya hanya dikembalikan di sini, satu kali. Setelah
 * respons ini basis data hanya memegang hash-nya dan nilai aslinya tidak bisa
 * ditampilkan lagi oleh siapa pun, termasuk oleh sistem ini sendiri.
 */
exports.create = async (req, res) => {
  const name = String((req.body && req.body.name) || '').trim();
  if (name.length < 2) {
    throw ApiError.badRequest('Nama API key minimal 2 karakter, misalnya "Aplikasi Mobile".');
  }

  const existing = await listApiKeysForUser(req.user.id);
  if (existing.filter((k) => !k.revoked_at).length >= MAX_KEYS_PER_USER) {
    throw ApiError.forbidden(
      `Maksimal ${MAX_KEYS_PER_USER} API key aktif per akun. Cabut API key lama terlebih dahulu.`
    );
  }

  const planCode = String((req.body && req.body.plan) || 'free').toLowerCase();
  const plan = await findPlanByCode(planCode);
  if (!plan) {
    throw ApiError.badRequest(`Paket "${planCode}" tidak dikenal.`);
  }

  const { key, keyHash, keyPrefix } = generateApiKey();
  const created = await createApiKey({
    userId: req.user.id,
    planId: plan.id,
    name,
    keyHash,
    keyPrefix,
  });

  return res.status(201).json({
    data: {
      id: created.id,
      name: created.name,
      key,
      plan: { code: plan.code, name: plan.name, daily_quota: plan.daily_quota },
      created_at: created.created_at,
    },
    meta: {
      warning: 'Simpan API key ini sekarang. Nilainya tidak akan ditampilkan lagi.',
    },
  });
};

/** GET /keys/:id/usage — riwayat permintaan terakhir untuk satu API key. */
exports.keyUsage = async (req, res) => {
  const key = await findApiKeyById({ id: req.params.id, userId: req.user.id });
  if (!key) throw ApiError.notFound('API key tidak ditemukan.');

  const logs = await getRecentLogsForKey({ apiKeyId: key.id, limit: 50 });
  return res.json({
    data: logs,
    meta: { key: { id: key.id, name: key.name, prefix: key.key_prefix }, count: logs.length },
  });
};

/** DELETE /keys/:id — mencabut API key; barisnya tetap disimpan demi riwayat log. */
exports.revoke = async (req, res) => {
  const revoked = await revokeApiKey({ id: req.params.id, userId: req.user.id });
  if (!revoked) {
    throw ApiError.notFound('API key tidak ditemukan atau sudah dicabut.');
  }
  return res.json({ data: revoked });
};
