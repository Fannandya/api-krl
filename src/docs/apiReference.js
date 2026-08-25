'use strict';

/**
 * Isi halaman /docs: peta akses, daftar endpoint beserta parameternya, contoh
 * pemanggilan, dan contoh balasan.
 *
 * Berkas ini sengaja tidak menyentuh basis data maupun Express — hanya data.
 * Alasannya sama seperti src/services/: bagian yang panjang dan sering disunting
 * lebih mudah diperiksa kalau ia tidak bisa menimbulkan efek samping apa pun.
 *
 * Seluruh contoh balasan di bawah adalah keluaran sungguhan dari server ini
 * dengan data awal db/seed.sql, dipotong seperlunya agar muat dibaca. Bagian
 * yang dipotong ditandai "... dipotong".
 *
 * Nilai bawaan dan batas tiap parameter mengikuti src/controllers/_helpers.js
 * serta controller masing-masing; kalau salah satunya berubah, perbarui juga
 * keterangan di sini.
 */

const AUTH = {
  publik: { label: 'publik', what: 'Tanpa kredensial apa pun.' },
  jwt: { label: 'JWT', what: 'Perlu header Authorization: Bearer <token>.' },
  keduanya: { label: 'JWT + API key', what: 'Perlu token JWT dan API key milik akun yang sama.' },
};

/** Ringkasan siapa boleh mengakses apa. Dibaca lebih dulu oleh pendatang baru. */
const ACCESS_MAP = [
  {
    akses: 'publik',
    rute: ['GET /', 'GET /docs', 'GET /login', 'GET /register', 'GET /health'],
    what: 'Halaman web dan pemeriksaan status. Terbuka untuk siapa saja.',
  },
  {
    akses: 'publik',
    rute: ['POST /auth/register', 'POST /auth/login', 'POST /auth/logout'],
    what: 'Pintu masuk. Dua endpoint inilah satu-satunya cara memperoleh token.',
  },
  {
    akses: 'jwt',
    rute: ['GET /dashboard', 'GET /auth/me', 'GET /keys', 'POST /keys', 'GET /keys/plans', 'GET /keys/usage', 'GET /keys/:id/usage', 'DELETE /keys/:id'],
    what: 'Urusan akun sendiri. Cukup token; API key belum tentu kamu punya saat pertama kali masuk.',
  },
  {
    akses: 'keduanya',
    rute: ['GET /v1/stations', 'GET /v1/stations/:code', 'GET /v1/lines', 'GET /v1/lines/:code', 'GET /v1/schedules', 'GET|POST /v1/route', 'GET /v1/fare', 'GET /v1/stats'],
    what: 'Seluruh endpoint data. Token membuktikan siapa kamu, API key menentukan kuota yang terpakai.',
  },
];

/**
 * @param {string} url alamat pangkal aplikasi, dipakai pada contoh curl.
 */
function buildReference(url) {
  const H = `-H "Authorization: Bearer $TOKEN" \\\n  -H "X-API-Key: $KEY"`;
  const HJ = `-H "Authorization: Bearer $TOKEN"`;

  const dataEndpoints = [
    {
      id: 'stations',
      method: 'GET',
      path: '/v1/stations',
      auth: 'keduanya',
      what: 'Daftar stasiun. Punya dua mode: penyaringan biasa, atau pencarian '
        + 'stasiun terdekat bila parameter near diberikan.',
      params: [
        { name: 'search', what: 'Cari pada nama atau kode stasiun.' },
        { name: 'line', what: 'Hanya stasiun yang dilayani lin ini, misalnya BOG.' },
        { name: 'city', what: 'Hanya stasiun di kota ini.' },
        { name: 'limit', what: 'Jumlah baris per halaman, 1-100.', bawaan: '25 (10 pada mode near)' },
        { name: 'page', what: 'Halaman keberapa, 1-10000.', bawaan: '1' },
        { name: 'near', what: 'Cari yang terdekat dari "lintang,bujur", misalnya -6.21,106.85. Mengaktifkan mode near.' },
        { name: 'radius_km', what: 'Radius pencarian mode near, 0.1-200.', bawaan: '5' },
      ],
      contoh: `curl "${url}/v1/stations?line=BOG&limit=2" \\\n  ${H}`,
      balasan: `{
  "data": [
    {
      "code": "AC",
      "name": "Ancol",
      "city": "Jakarta Utara",
      "latitude": -6.127,
      "longitude": 106.833,
      "is_interchange": false,
      "interchange_minutes": 5,
      "lines": ["TJP"]
    }
  ],
  "meta": { "total": 74, "page": 1, "limit": 2, "total_pages": 37, "has_next": true }
}`,
      catatan: 'Pada mode near, meta berganti menjadi { mode, origin, radius_km, count } '
        + 'dan tiap stasiun membawa distance_km.',
    },
    {
      id: 'station-show',
      method: 'GET',
      path: '/v1/stations/:code',
      auth: 'keduanya',
      what: 'Satu stasiun beserta lin yang melayaninya dan stasiun tetangganya di tiap lin.',
      params: [
        { name: 'code', required: true, di: 'path', what: 'Kode stasiun, misalnya BOO. Huruf besar-kecil tidak dibedakan.' },
      ],
      contoh: `curl "${url}/v1/stations/BOO" \\\n  ${H}`,
      balasan: `{
  "data": {
    "code": "BOO",
    "name": "Bogor",
    "city": "Kota Bogor",
    "latitude": -6.595,
    "longitude": 106.79,
    "is_interchange": false,
    "interchange_minutes": 5,
    "served_by": [
      {
        "line_code": "BOG",
        "line_name": "Lin Bogor",
        "color_hex": "#D32F2F",
        "stop_order": 1,
        "distance_km_from_origin": 0,
        "previous_station": null,
        "next_station": { "code": "CLT", "name": "Cilebut" }
      }
    ]
  }
}`,
    },
    {
      id: 'lines',
      method: 'GET',
      path: '/v1/lines',
      auth: 'keduanya',
      what: 'Keenam lin beserta jumlah stasiun, panjang jalur, dan waktu tempuh ujung ke ujung.',
      params: [],
      contoh: `curl "${url}/v1/lines" \\\n  ${H}`,
      balasan: `{
  "data": [
    {
      "code": "BOG",
      "name": "Lin Bogor",
      "color_hex": "#D32F2F",
      "operator": "KAI Commuter",
      "description": "Bogor - Manggarai - Jakarta Kota",
      "station_count": 24,
      "length_km": 51.2,
      "travel_minutes": 93
    }
    ... dipotong, seluruhnya 6 lin
  ],
  "meta": { "count": 6 }
}`,
    },
    {
      id: 'line-show',
      method: 'GET',
      path: '/v1/lines/:code',
      auth: 'keduanya',
      what: 'Satu lin dengan seluruh perhentiannya secara berurutan, termasuk jarak kumulatif dari stasiun awal.',
      params: [
        { name: 'code', required: true, di: 'path', what: 'Kode lin: BOG, CKR, RGD, TJP, TNG, atau BST.' },
      ],
      contoh: `curl "${url}/v1/lines/BOG" \\\n  ${H}`,
      balasan: `{
  "data": {
    "code": "BOG",
    "name": "Lin Bogor",
    "station_count": 24,
    "length_km": 51.2,
    "travel_minutes": 93,
    "stations": [
      {
        "code": "BOO",
        "name": "Bogor",
        "city": "Kota Bogor",
        "is_interchange": false,
        "stop_order": 1,
        "distance_km_from_origin": 0,
        "travel_minutes_from_prev": 0
      },
      {
        "code": "CLT",
        "name": "Cilebut",
        "stop_order": 2,
        "distance_km_from_origin": 5.5,
        "travel_minutes_from_prev": 9
      }
      ... dipotong, seluruhnya 24 stasiun
    ]
  }
}`,
    },
    {
      id: 'schedules',
      method: 'GET',
      path: '/v1/schedules',
      auth: 'keduanya',
      what: 'Jam keberangkatan dari sebuah stasiun. Jam-jam ini dibangkitkan saat '
        + 'permintaan datang dari pola headway di tabel service_patterns, bukan '
        + 'diambil dari daftar jadwal yang disimpan.',
      params: [
        { name: 'station', required: true, what: 'Kode stasiun, misalnya BOO.' },
        { name: 'day', what: 'weekday atau weekend.', bawaan: 'weekday' },
        { name: 'direction', what: 'up atau down.', bawaan: 'kedua arah' },
        { name: 'line', what: 'Hanya lin ini.', bawaan: 'semua lin yang melewati stasiun itu' },
        { name: 'after', what: 'Mulai dari jam ini, format HH:MM.', bawaan: 'dari awal hari operasi' },
        { name: 'limit', what: 'Jumlah keberangkatan, 1-200.', bawaan: '20' },
      ],
      contoh: `curl "${url}/v1/schedules?station=BOO&after=07:00&limit=2" \\\n  ${H}`,
      balasan: `{
  "data": [
    {
      "time": "04:00",
      "line_code": "BOG",
      "line_name": "Lin Bogor",
      "direction": "down",
      "day_type": "weekday",
      "headway_minutes": 12
    }
    ... dipotong
  ],
  "meta": {
    "station": { "code": "BOO", "name": "Bogor" },
    "day_type": "weekday",
    "after": "07:00",
    "direction": "semua",
    "pattern_count": 10,
    "count": 2,
    "note": "Jam keberangkatan dibangkitkan dari pola headway, bukan jadwal resmi."
  }
}`,
    },
    {
      id: 'route',
      method: 'POST',
      path: '/v1/route',
      auth: 'keduanya',
      what: 'Rute tercepat antara dua stasiun: urutan lin yang dinaiki, jumlah '
        + 'transfer, waktu tempuh, dan tarifnya. Yang diminimalkan adalah waktu, '
        + 'termasuk waktu pindah lin — jadi rute yang lebih jauh bisa saja menang.',
      params: [
        { name: 'from', required: true, what: 'Kode stasiun asal.' },
        { name: 'to', required: true, what: 'Kode stasiun tujuan.' },
        { name: 'day_type', what: 'weekday atau weekend.', bawaan: 'weekday' },
        { name: 'depart_at', what: 'Jam berangkat HH:MM. Bila diisi, balasan memuat tiga keberangkatan berikutnya.', bawaan: 'kosong' },
      ],
      contoh: `curl -X POST "${url}/v1/route" \\\n  ${H} \\\n  -H "Content-Type: application/json" \\\n  -d '{"from":"BOO","to":"THB","day_type":"weekday"}'`,
      balasan: `{
  "data": {
    "from": { "code": "BOO", "name": "Bogor" },
    "to": { "code": "THB", "name": "Tanah Abang" },
    "total_minutes": 91,
    "total_distance_km": 46.9,
    "transfers": 1,
    "transfer_minutes": 6,
    "legs": [
      {
        "line_code": "BOG",
        "line_name": "Lin Bogor",
        "from": { "code": "BOO", "name": "Bogor" },
        "to": { "code": "MRI", "name": "Manggarai" },
        "stops": 16,
        "minutes": 76,
        "distance_km": 41.8,
        "stations": ["BOO", "CLT", "BJD", "... dipotong", "MRI"]
      }
      ... dipotong, leg kedua MRI - THB
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
    },
    "next_departures": []
  },
  "meta": {
    "day_type": "weekday",
    "optimized_for": "waktu tempuh tersingkat, termasuk waktu pindah lin"
  }
}`,
      catatan: 'Endpoint yang sama juga menerima GET dengan parameter di query string, '
        + `misalnya GET /v1/route?from=BOO&to=THB — berguna untuk mencoba cepat dari peramban.`,
    },
    {
      id: 'fare',
      method: 'GET',
      path: '/v1/fare',
      auth: 'keduanya',
      what: 'Tarif antara dua stasiun tanpa rincian rutenya. Tarif dihitung dari '
        + 'jarak total perjalanan, sesuai cara KRL menagih: sekali tap masuk, sekali tap keluar.',
      params: [
        { name: 'from', required: true, what: 'Kode stasiun asal.' },
        { name: 'to', required: true, what: 'Kode stasiun tujuan.' },
      ],
      contoh: `curl "${url}/v1/fare?from=BOO&to=THB" \\\n  ${H}`,
      balasan: `{
  "data": {
    "from": "BOO",
    "to": "THB",
    "distance_km": 46.9,
    "total_idr": 6000,
    "components": [{
      "rule": "Tarif Commuter Line",
      "lines": ["BOG", "CKR"],
      "distance_km": 46.9,
      "amount_idr": 6000,
      "breakdown": "Rp3.000 untuk 25 km pertama + Rp3.000 untuk sisa 21.90 km (3 x 10 km)"
    }]
  },
  "meta": { "transfers": 1, "total_minutes": 91 }
}`,
      catatan: 'Lin bertarif sendiri seperti KA Bandara ditagih terpisah, sehingga '
        + 'components bisa berisi lebih dari satu baris.',
    },
    {
      id: 'stats',
      method: 'GET',
      path: '/v1/stats',
      auth: 'keduanya',
      what: 'Ringkasan jaringan. Paling ringan, jadi paling cocok dipakai untuk '
        + 'memastikan kredensialmu sudah benar.',
      params: [],
      contoh: `curl "${url}/v1/stats" \\\n  ${H}`,
      balasan: `{
  "data": {
    "station_count": 74,
    "line_count": 6,
    "interchange_count": 6,
    "stop_count": 82,
    "city_count": 14,
    "total_length_km": 234.6
  },
  "meta": { "source": "Data referensi akademik, bukan data operasional KAI Commuter." }
}`,
    },
  ];

  const accountEndpoints = [
    {
      id: 'register',
      method: 'POST',
      path: '/auth/register',
      auth: 'publik',
      what: 'Buat akun baru. Langsung mengembalikan token, jadi tidak perlu login lagi sesudahnya.',
      params: [
        { name: 'email', required: true, di: 'body', what: 'Alamat e-mail yang sah dan belum terdaftar.' },
        { name: 'password', required: true, di: 'body', what: 'Minimal 8 karakter.' },
        { name: 'full_name', required: true, di: 'body', what: 'Minimal 2 karakter.' },
      ],
      contoh: `curl -X POST "${url}/auth/register" \\\n  -H "Content-Type: application/json" \\\n  -d '{"email":"kamu@contoh.com","password":"katasandi123","full_name":"Nama Kamu"}'`,
      balasan: `{
  "data": {
    "user": { "id": "1bee1645-...", "email": "kamu@contoh.com", "full_name": "Nama Kamu" },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 3600
  }
}`,
      catatan: 'Balasannya 201. Token juga dikirim sebagai cookie httpOnly bernama '
        + 'token, itulah yang dipakai dashboard di peramban.',
    },
    {
      id: 'login',
      method: 'POST',
      path: '/auth/login',
      auth: 'publik',
      what: 'Masuk dan ambil token baru. Panggil lagi endpoint ini setiap kali token lama kedaluwarsa.',
      params: [
        { name: 'email', required: true, di: 'body', what: 'E-mail akun.' },
        { name: 'password', required: true, di: 'body', what: 'Kata sandi akun.' },
      ],
      contoh: `curl -X POST "${url}/auth/login" \\\n  -H "Content-Type: application/json" \\\n  -d '{"email":"kamu@contoh.com","password":"katasandi123"}'`,
      balasan: `{
  "data": {
    "user": { "id": "1bee1645-...", "email": "kamu@contoh.com", "full_name": "Nama Kamu" },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 3600
  }
}`,
      catatan: 'E-mail tidak terdaftar dan kata sandi salah dijawab dengan pesan yang '
        + 'sama persis, supaya balasannya tidak bisa dipakai menebak e-mail mana yang terdaftar.',
    },
    {
      id: 'logout',
      method: 'POST',
      path: '/auth/logout',
      auth: 'publik',
      what: 'Hapus cookie sesi di peramban. Token yang sudah terlanjur dipegang klien '
        + 'tetap sah sampai kedaluwarsa dengan sendirinya.',
      params: [],
      contoh: `curl -X POST "${url}/auth/logout"`,
      balasan: `{ "data": { "message": "Sesi diakhiri." } }`,
    },
    {
      id: 'me',
      method: 'GET',
      path: '/auth/me',
      auth: 'jwt',
      what: 'Profil akun yang sedang masuk. Berguna untuk memeriksa token masih hidup atau tidak.',
      params: [],
      contoh: `curl "${url}/auth/me" \\\n  ${HJ}`,
      balasan: `{
  "data": {
    "id": "1bee1645-...",
    "email": "kamu@contoh.com",
    "full_name": "Nama Kamu",
    "created_at": "2026-08-25T12:30:58.659Z"
  }
}`,
    },
    {
      id: 'keys-create',
      method: 'POST',
      path: '/keys',
      auth: 'jwt',
      what: 'Buat API key baru. Nilai key yang utuh hanya muncul di balasan ini, '
        + 'satu kali — sesudahnya basis data hanya memegang hash-nya.',
      params: [
        { name: 'name', required: true, di: 'body', what: 'Nama penanda, minimal 2 karakter.' },
        { name: 'plan', di: 'body', what: 'Kode paket: free atau pro.', bawaan: 'free' },
      ],
      contoh: `curl -X POST "${url}/keys" \\\n  ${HJ} \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"Aplikasi Mobile","plan":"free"}'`,
      balasan: `{
  "data": {
    "id": "07715102-...",
    "name": "Aplikasi Mobile",
    "key": "krl_live_076de0a65341ad728142e433af0a6035",
    "plan": { "code": "free", "name": "Free", "daily_quota": 1000 },
    "created_at": "2026-08-25T12:30:58.707Z"
  },
  "meta": { "warning": "Simpan API key ini sekarang. Nilainya tidak akan ditampilkan lagi." }
}`,
      catatan: 'Maksimal 10 API key aktif per akun. Melewati batas itu dijawab 403.',
    },
    {
      id: 'keys-list',
      method: 'GET',
      path: '/keys',
      auth: 'jwt',
      what: 'Semua API key milikmu beserta pemakaian hari ini. Nilai key-nya ditutupi.',
      params: [],
      contoh: `curl "${url}/keys" \\\n  ${HJ}`,
      balasan: `{
  "data": [{
    "id": "07715102-...",
    "name": "Aplikasi Mobile",
    "key_prefix": "krl_live_076d",
    "masked": "krl_live_076d********",
    "plan": { "code": "free", "name": "Free", "daily_quota": 1000 },
    "usage": { "used_today": 9, "used_total": 9, "remaining_today": 991 },
    "created_at": "2026-08-25T12:30:58.707Z",
    "last_used_at": "2026-08-25T12:30:58.891Z",
    "revoked_at": null,
    "status": "active"
  }],
  "meta": { "count": 1 }
}`,
    },
    {
      id: 'plans',
      method: 'GET',
      path: '/keys/plans',
      auth: 'jwt',
      what: 'Daftar paket yang bisa dipilih saat membuat API key.',
      params: [],
      contoh: `curl "${url}/keys/plans" \\\n  ${HJ}`,
      balasan: `{
  "data": [
    { "id": 1, "code": "free", "name": "Free", "daily_quota": 1000, "rate_limit_per_minute": 60, "price_idr": 0 },
    { "id": 2, "code": "pro", "name": "Pro", "daily_quota": 50000, "rate_limit_per_minute": 600, "price_idr": 149000 }
  ]
}`,
    },
    {
      id: 'usage',
      method: 'GET',
      path: '/keys/usage',
      auth: 'jwt',
      what: 'Pemakaian harian seluruh API key milikmu. Hari tanpa permintaan tetap '
        + 'muncul sebagai nol supaya grafiknya tidak bolong.',
      params: [
        { name: 'days', what: 'Berapa hari ke belakang, 1-30.', bawaan: '7' },
      ],
      contoh: `curl "${url}/keys/usage?days=7" \\\n  ${HJ}`,
      balasan: `{
  "data": [
    { "date": "2026-08-19", "requests": 0, "avg_latency_ms": 0, "errors": 0 },
    { "date": "2026-08-25", "requests": 9, "avg_latency_ms": 3, "errors": 1 }
    ... dipotong
  ]
}`,
    },
    {
      id: 'key-usage',
      method: 'GET',
      path: '/keys/:id/usage',
      auth: 'jwt',
      what: '50 permintaan terakhir untuk satu API key, lengkap dengan kode status dan lamanya.',
      params: [
        { name: 'id', required: true, di: 'path', what: 'UUID API key, dari balasan GET /keys.' },
      ],
      contoh: `curl "${url}/keys/07715102-.../usage" \\\n  ${HJ}`,
      balasan: `{
  "data": [
    {
      "endpoint": "/v1/fare/",
      "method": "GET",
      "status_code": 200,
      "latency_ms": 1,
      "created_at": "2026-08-25T12:30:58.891Z"
    }
    ... dipotong
  ]
}`,
    },
    {
      id: 'keys-revoke',
      method: 'DELETE',
      path: '/keys/:id',
      auth: 'jwt',
      what: 'Cabut API key. Berlaku seketika pada permintaan berikutnya; riwayat log-nya tetap tersimpan.',
      params: [
        { name: 'id', required: true, di: 'path', what: 'UUID API key yang mau dicabut.' },
      ],
      contoh: `curl -X DELETE "${url}/keys/07715102-..." \\\n  ${HJ}`,
      balasan: `{ "data": { "id": "07715102-...", "name": "Aplikasi Mobile", "revoked_at": "2026-08-25T12:31:10.204Z" } }`,
      catatan: 'Mencabut key yang sama dua kali dijawab 404.',
    },
    {
      id: 'health',
      method: 'GET',
      path: '/health',
      auth: 'publik',
      what: 'Pemeriksaan status layanan. Sengaja dibiarkan terbuka supaya alat '
        + 'pemantau bisa memeriksanya tanpa kredensial.',
      params: [],
      contoh: `curl "${url}/health"`,
      balasan: `{
  "data": {
    "status": "ok",
    "service": "KRL Data API",
    "environment": "development",
    "timestamp": "2026-08-25T12:30:59.059Z"
  }
}`,
    },
  ];

  return { dataEndpoints, accountEndpoints };
}

const ERROR_CODES = [
  { status: 400, code: 'bad_request', what: 'Parameter kurang, formatnya salah, atau di luar batas yang diizinkan.' },
  { status: 401, code: 'unauthorized', what: 'Token JWT atau API key tidak ada, salah, kedaluwarsa, atau sudah dicabut.' },
  { status: 403, code: 'forbidden', what: 'Kredensialnya sah tetapi tidak berhak — misalnya API key milik akun lain, atau jumlah key sudah mentok.' },
  { status: 404, code: 'not_found', what: 'Kode stasiun, kode lin, atau API key tidak ditemukan.' },
  { status: 422, code: 'unprocessable_entity', what: 'Permintaan sah tetapi tidak bisa dipenuhi, misalnya dua stasiun yang tidak terhubung.' },
  { status: 429, code: 'quota_exceeded', what: 'Kuota harian paket sudah habis. Lihat header X-RateLimit-Reset untuk waktu pulihnya.' },
  { status: 500, code: 'internal_server_error', what: 'Kesalahan di sisi server. Rincian internalnya sengaja tidak dibocorkan.' },
];

const CONTOH_ERROR = `{
  "error": {
    "code": "quota_exceeded",
    "message": "Kuota harian paket Free sudah habis.",
    "details": {
      "limit": 1000,
      "used": 1000,
      "reset_at": "2026-08-26T17:00:00.000Z",
      "upgrade_hint": "Naikkan ke paket Pro untuk 50.000 permintaan per hari."
    }
  }
}`;

module.exports = { AUTH, ACCESS_MAP, ERROR_CODES, CONTOH_ERROR, buildReference };
