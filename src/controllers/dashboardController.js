'use strict';

const { listLines, getLineByCode, getNetworkStats, listStations } = require('../models/network');
const { listApiKeysForUser, listPlans } = require('../models/apiKeys');
const { getDailyUsageForUser, getTopEndpointsForUser } = require('../models/logs');
const { maskApiKey } = require('../services/apiKey');

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

const DATA_ENDPOINTS = [
  { method: 'GET', path: '/v1/stations', what: 'Daftar stasiun. Saring dengan search, line, city, atau near=lintang,bujur.' },
  { method: 'GET', path: '/v1/stations/:code', what: 'Detail satu stasiun, lin yang melayaninya, dan stasiun tetangganya.' },
  { method: 'GET', path: '/v1/lines', what: 'Daftar lin beserta jumlah stasiun dan panjang jalur.' },
  { method: 'GET', path: '/v1/lines/:code', what: 'Detail satu lin dengan seluruh perhentian secara berurutan.' },
  { method: 'GET', path: '/v1/schedules', what: 'Jam keberangkatan dari sebuah stasiun. Wajib parameter station.' },
  { method: 'POST', path: '/v1/route', what: 'Cari rute tercepat antar stasiun, lengkap dengan transfer dan tarif.' },
  { method: 'GET', path: '/v1/fare', what: 'Tarif antar dua stasiun tanpa rincian rute.' },
  { method: 'GET', path: '/v1/stats', what: 'Ringkasan jaringan. Berguna sebagai panggilan uji coba.' },
];

const ACCOUNT_ENDPOINTS = [
  { method: 'POST', path: '/auth/register', what: 'Buat akun. Mengembalikan token JWT.' },
  { method: 'POST', path: '/auth/login', what: 'Masuk. Mengembalikan token JWT.' },
  { method: 'POST', path: '/auth/logout', what: 'Akhiri sesi dan hapus cookie.' },
  { method: 'GET', path: '/auth/me', what: 'Profil akun yang sedang masuk.' },
  { method: 'GET', path: '/keys', what: 'Daftar API key beserta pemakaiannya.' },
  { method: 'POST', path: '/keys', what: 'Buat API key baru. Nilai key hanya muncul di balasan ini.' },
  { method: 'GET', path: '/keys/:id/usage', what: 'Riwayat 50 permintaan terakhir untuk satu API key.' },
  { method: 'DELETE', path: '/keys/:id', what: 'Cabut API key. Riwayat log-nya tetap tersimpan.' },
];

const ERROR_CODES = [
  { status: 400, code: 'bad_request', what: 'Parameter kurang atau formatnya tidak sesuai.' },
  { status: 401, code: 'unauthorized', what: 'API key atau token JWT tidak ada, salah, atau sudah dicabut.' },
  { status: 404, code: 'not_found', what: 'Kode stasiun, lin, atau API key tidak ditemukan.' },
  { status: 422, code: 'unprocessable_entity', what: 'Permintaan sah tetapi tidak bisa dipenuhi, misalnya dua stasiun yang tidak terhubung.' },
  { status: 429, code: 'quota_exceeded', what: 'Kuota harian paket sudah habis. Lihat header X-RateLimit-Reset.' },
];

const CONTOH_RUTE = `{
  "data": {
    "from": { "code": "BOO", "name": "Bogor" },
    "to":   { "code": "THB", "name": "Tanah Abang" },
    "total_minutes": 91,
    "total_distance_km": 46.9,
    "transfers": 1,
    "transfer_minutes": 6,
    "legs": [
      { "line_code": "BOG", "from": { "code": "BOO" }, "to": { "code": "MRI" },
        "stops": 16, "minutes": 76, "distance_km": 41.8 },
      { "line_code": "CKR", "from": { "code": "MRI" }, "to": { "code": "THB" },
        "stops": 3,  "minutes": 9,  "distance_km": 5.1 }
    ],
    "fare": {
      "total_idr": 6000,
      "components": [{
        "rule": "Tarif Commuter Line",
        "lines": ["BOG", "CKR"],
        "distance_km": 46.9,
        "amount_idr": 6000,
        "breakdown": "Rp3.000 untuk 25 km pertama + Rp3.000 untuk sisa 21.90 km (3 x 10 km)"
      }]
    }
  }
}`;


/** Halaman dokumentasi. Terbuka untuk umum. */
exports.docs = async (req, res) => {
  const { stations } = await listStations({ limit: 100, offset: 0 });

  res.render('docs', {
    title: 'Dokumentasi',
    user: req.user,
    dataEndpoints: DATA_ENDPOINTS,
    accountEndpoints: ACCOUNT_ENDPOINTS,
    errorCodes: ERROR_CODES,
    contohRute: CONTOH_RUTE,
    interchanges: stations.filter((s) => s.is_interchange),
  });
};
