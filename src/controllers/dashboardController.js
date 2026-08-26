'use strict';

const { listLines, getLineByCode, getNetworkStats, listStations } = require('../models/network');
const { listApiKeysForUser, listPlans } = require('../models/apiKeys');
const { getDailyUsageForUser, getTopEndpointsForUser } = require('../models/logs');
const { maskApiKey } = require('../services/apiKey');
const {
  AUTH, ACCESS_MAP, ERROR_CODES, CONTOH_ERROR, HOW_IT_WORKS, FAQ, buildReference,
} = require('../docs/apiReference');

/** Beranda. Diagram jalur di bagian atas dibaca langsung dari basis data. */
exports.home = async (req, res) => {
  const [stats, lines] = await Promise.all([getNetworkStats(), listLines()]);

  // Keenam lin ikut dikirim supaya pengunjung bisa mengganti lin yang tampil di
  // panel contoh data tanpa memuat ulang halaman. Beranda terbuka untuk umum,
  // jadi mengambilnya lewat /v1/lines dari peramban bukan pilihan: endpoint itu
  // menuntut token dan API key.
  const lineDetails = await Promise.all(lines.map((l) => getLineByCode(l.code)));

  res.render('home', {
    title: 'Beranda',
    user: req.user,
    stats,
    lines,
    lineDetails,
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
  const [rawKeys, plans, usage, topEndpoints, lines] = await Promise.all([
    listApiKeysForUser(req.user.id),
    listPlans(),
    getDailyUsageForUser({ userId: req.user.id, days: 7 }),
    getTopEndpointsForUser({ userId: req.user.id, limit: 5 }),
    listLines(),
  ]);

  // Penjelajah lin memakai dua bentuk data yang sama-sama sudah ada: listLines()
  // menghasilkan persis apa yang dibalas GET /v1/lines — itulah yang ditampilkan
  // sebagai JSON supaya bisa dicocokkan — sedangkan getLineByCode() menambahkan
  // urutan stasiun yang dibutuhkan diagram jalurnya.
  const lineDetails = await Promise.all(lines.map((l) => getLineByCode(l.code)));

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
    lines,
    lineDetails,
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
    howItWorks: HOW_IT_WORKS,
    faq: FAQ,
    plans,
    lines,
    interchanges: stations.filter((s) => s.is_interchange),
  });
};
