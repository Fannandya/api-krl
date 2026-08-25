'use strict';

const { listLines, getLineByCode, getNetworkStats, listStations } = require('../models/network');
const { listApiKeysForUser, listPlans } = require('../models/apiKeys');
const { getDailyUsageForUser, getTopEndpointsForUser } = require('../models/logs');
const { maskApiKey } = require('../services/apiKey');
const {
  AUTH, ACCESS_MAP, ERROR_CODES, CONTOH_ERROR, buildReference,
} = require('../docs/apiReference');

/** Beranda. Diagram jalur di bagian atas dibaca langsung dari basis data. */
exports.home = async (req, res) => {
  const [stats, lines, featuredLine] = await Promise.all([
    getNetworkStats(),
    listLines(),
    getLineByCode('BOG'),
  ]);

  res.render('home', {
    title: 'Beranda',
    user: req.user,
    stats,
    lines,
    featuredLine,
  });
};

exports.loginPage = (req, res) => {
  if (req.user) return res.redirect('/dashboard');
  return res.render('login', { title: 'Masuk', user: null });
};

exports.registerPage = (req, res) => {
  if (req.user) return res.redirect('/dashboard');
  return res.render('register', { title: 'Daftar', user: null });
};

/** Dashboard pemilik akun. */
exports.dashboard = async (req, res) => {
  const [rawKeys, plans, usage, topEndpoints] = await Promise.all([
    listApiKeysForUser(req.user.id),
    listPlans(),
    getDailyUsageForUser({ userId: req.user.id, days: 7 }),
    getTopEndpointsForUser({ userId: req.user.id, limit: 5 }),
  ]);

  const keys = rawKeys.map((row) => ({
    id: row.id,
    name: row.name,
    masked: maskApiKey(row.key_prefix),
    plan: { code: row.plan_code, name: row.plan_name, daily_quota: row.daily_quota },
    usage: {
      used_today: row.used_today,
      used_total: row.used_total,
      remaining_today: Math.max(0, row.daily_quota - row.used_today),
    },
    created_at: row.created_at,
    last_used_at: row.last_used_at,
    status: row.revoked_at ? 'revoked' : 'active',
  }));

  res.render('dashboard', {
    title: 'Dashboard',
    user: req.user,
    keys,
    plans,
    usage,
    topEndpoints,
  });
};

/** Halaman dokumentasi. Terbuka untuk umum. */
exports.docs = async (req, res) => {
  const [{ stations }, plans, lines] = await Promise.all([
    listStations({ limit: 100, offset: 0 }),
    listPlans(),
    listLines(),
  ]);

  // Contoh curl memuat alamat aplikasi yang sedang berjalan, supaya bisa
  // disalin apa adanya baik dari localhost maupun dari produksi.
  const { dataEndpoints, accountEndpoints } = buildReference(req.app.locals.appUrl);

  res.render('docs', {
    title: 'Dokumentasi',
    user: req.user,
    dataEndpoints,
    accountEndpoints,
    accessMap: ACCESS_MAP,
    authLabels: AUTH,
    errorCodes: ERROR_CODES,
    contohError: CONTOH_ERROR,
    plans,
    lines,
    interchanges: stations.filter((s) => s.is_interchange),
  });
};
