'use strict';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

const { resetDatabase, closeDatabase, uniqueEmail, query } = require('./helpers/env');
const { createApp } = require('../src/app');

const app = createApp();

/** Daftarkan akun baru dan kembalikan token beserta pembantu permintaan. */
async function akunSiapPakai() {
  const email = uniqueEmail();
  const res = await request(app)
    .post('/auth/register')
    .send({ email, password: 'katasandi123', full_name: 'Pemilik Key' })
    .expect(201);
  return { email, token: res.body.data.token, userId: res.body.data.user.id };
}

async function createKey(token, name = 'Key Uji', plan = 'free') {
  const res = await request(app)
    .post('/keys')
    .set('Authorization', `Bearer ${token}`)
    .send({ name, plan })
    .expect(201);
  return res.body.data;
}

test.before(async () => { await resetDatabase(); });
test.after(async () => { await closeDatabase(); });

test('nilai API key hanya muncul saat dibuat, tidak pernah lagi sesudahnya', async () => {
  const { token } = await akunSiapPakai();
  const dibuat = await createKey(token);

  assert.match(dibuat.key, /^krl_live_[0-9a-f]{32}$/);

  const daftar = await request(app)
    .get('/keys')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  const isi = JSON.stringify(daftar.body);
  assert.ok(!isi.includes(dibuat.key), 'daftar API key tidak boleh memuat nilai key yang utuh');
  assert.ok(daftar.body.data[0].masked.startsWith('krl_live_'));
});

test('basis data hanya menyimpan hash, bukan API key-nya', async () => {
  const { token } = await akunSiapPakai();
  const dibuat = await createKey(token);

  const { rows } = await query('SELECT key_hash, key_prefix FROM api_keys WHERE id = $1', [dibuat.id]);
  assert.notStrictEqual(rows[0].key_hash, dibuat.key);
  assert.match(rows[0].key_hash, /^[0-9a-f]{64}$/);
});

test('API key tanpa nama yang memadai ditolak', async () => {
  const { token } = await akunSiapPakai();
  await request(app)
    .post('/keys')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'x' })
    .expect(400);
});

test('API key milik pengguna lain tidak terlihat dan tidak bisa dicabut', async () => {
  const budi = await akunSiapPakai();
  const siti = await akunSiapPakai();
  const budiKey = await createKey(budi.token, 'Milik Budi');

  const daftarSiti = await request(app)
    .get('/keys')
    .set('Authorization', `Bearer ${siti.token}`)
    .expect(200);
  assert.strictEqual(daftarSiti.body.data.length, 0);

  await request(app)
    .delete(`/keys/${budiKey.id}`)
    .set('Authorization', `Bearer ${siti.token}`)
    .expect(404);
});

test('API key yang dicabut langsung ditolak di endpoint data', async () => {
  const { token } = await akunSiapPakai();
  const key = await createKey(token);

  await request(app).get('/v1/stats')
    .set('Authorization', `Bearer ${token}`)
    .set('X-API-Key', key.key).expect(200);

  await request(app)
    .delete(`/keys/${key.id}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  const ditolak = await request(app).get('/v1/stats')
    .set('Authorization', `Bearer ${token}`)
    .set('X-API-Key', key.key).expect(401);
  assert.match(ditolak.body.error.message, /dicabut/i);
});

test('mencabut API key yang sama dua kali ditolak', async () => {
  const { token } = await akunSiapPakai();
  const key = await createKey(token);

  await request(app).delete(`/keys/${key.id}`).set('Authorization', `Bearer ${token}`).expect(200);
  await request(app).delete(`/keys/${key.id}`).set('Authorization', `Bearer ${token}`).expect(404);
});

test('endpoint data menolak permintaan tanpa API key maupun dengan key asing', async () => {
  const { token } = await akunSiapPakai();

  await request(app).get('/v1/stations').expect(401);
  await request(app)
    .get('/v1/stations')
    .set('Authorization', `Bearer ${token}`)
    .expect(401);
  await request(app)
    .get('/v1/stations')
    .set('Authorization', `Bearer ${token}`)
    .set('X-API-Key', 'krl_live_palsu')
    .expect(401);
});

test('setiap permintaan ber-API-key tercatat di request_logs', async () => {
  const { token } = await akunSiapPakai();
  const key = await createKey(token);

  await request(app).get('/v1/lines')
    .set('Authorization', `Bearer ${token}`)
    .set('X-API-Key', key.key).expect(200);
  await request(app).get('/v1/stations/ZZZ')
    .set('Authorization', `Bearer ${token}`)
    .set('X-API-Key', key.key).expect(404);

  // Pencatatan terjadi pada event 'finish', jadi beri satu putaran event loop.
  await new Promise((resolve) => setTimeout(resolve, 120));

  const { rows } = await query(
    'SELECT method, status_code FROM request_logs WHERE api_key_id = $1 ORDER BY created_at',
    [key.id]
  );
  assert.strictEqual(rows.length, 2, 'permintaan gagal pun harus ikut tercatat');
  assert.deepStrictEqual(rows.map((r) => r.status_code), [200, 404]);
});

test('kuota harian ditegakkan dan permintaan berikutnya ditolak 429', async () => {
  const { token } = await akunSiapPakai();

  // Paket khusus berkuota dua supaya batasnya bisa diuji tanpa ribuan permintaan.
  await query(
    `INSERT INTO plans (code, name, daily_quota, rate_limit_per_minute, price_idr)
     VALUES ('uji_sempit', 'Uji Sempit', 2, 60, 0)
     ON CONFLICT (code) DO UPDATE SET daily_quota = 2`
  );
  const key = await createKey(token, 'Key Sempit', 'uji_sempit');

  const pertama = await request(app).get('/v1/stats')
    .set('Authorization', `Bearer ${token}`)
    .set('X-API-Key', key.key).expect(200);
  assert.strictEqual(pertama.headers['x-ratelimit-limit'], '2');
  assert.strictEqual(pertama.headers['x-ratelimit-remaining'], '2');

  await request(app).get('/v1/stats')
    .set('Authorization', `Bearer ${token}`)
    .set('X-API-Key', key.key).expect(200);
  await new Promise((resolve) => setTimeout(resolve, 150));

  const ditolak = await request(app).get('/v1/stats')
    .set('Authorization', `Bearer ${token}`)
    .set('X-API-Key', key.key).expect(429);
  assert.strictEqual(ditolak.body.error.code, 'quota_exceeded');
  assert.strictEqual(ditolak.body.error.details.limit, 2);
  assert.ok(ditolak.body.error.details.reset_at, 'balasan harus memberi tahu kapan kuota pulih');
  assert.strictEqual(ditolak.headers['x-ratelimit-remaining'], '0');
});

test('paket yang tidak dikenal ditolak saat membuat API key', async () => {
  const { token } = await akunSiapPakai();
  await request(app)
    .post('/keys')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Uji Paket', plan: 'platinum' })
    .expect(400);
});
