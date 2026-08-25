'use strict';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

const { resetDatabase, closeDatabase, uniqueEmail } = require('./helpers/env');
const { createApp } = require('../src/app');

const app = createApp();

const akunBaru = () => ({
  email: uniqueEmail(),
  password: 'katasandi123',
  full_name: 'Penguji Otomatis',
});

test.before(async () => { await resetDatabase(); });
test.after(async () => { await closeDatabase(); });

test('health terbuka tanpa kredensial apa pun', async () => {
  const res = await request(app).get('/health').expect(200);
  assert.strictEqual(res.body.data.status, 'ok');
});

test('pendaftaran mengembalikan token dan memasang cookie', async () => {
  const res = await request(app).post('/auth/register').send(akunBaru()).expect(201);

  assert.ok(res.body.data.token, 'token harus ikut dikembalikan untuk klien non peramban');
  assert.strictEqual(res.body.data.token_type, 'Bearer');
  assert.ok(
    res.headers['set-cookie'].some((c) => c.startsWith('token=') && c.includes('HttpOnly')),
    'cookie sesi harus httpOnly supaya tidak terbaca JavaScript'
  );
  assert.strictEqual(res.body.data.user.password_hash, undefined, 'hash kata sandi tidak boleh bocor');
});

test('e-mail disimpan dalam huruf kecil dan tidak boleh ganda', async () => {
  const akun = akunBaru();
  await request(app).post('/auth/register').send(akun).expect(201);

  const res = await request(app)
    .post('/auth/register')
    .send({ ...akun, email: akun.email.toUpperCase() })
    .expect(409);

  assert.strictEqual(res.body.error.code, 'conflict');
});

test('data pendaftaran yang tidak sah ditolak dengan rincian per kolom', async () => {
  const res = await request(app)
    .post('/auth/register')
    .send({ email: 'bukan-email', password: '123', full_name: '' })
    .expect(400);

  const kolom = res.body.error.details.map((d) => d.field).sort();
  assert.deepStrictEqual(kolom, ['email', 'full_name', 'password']);
});

test('masuk dengan kredensial benar menghasilkan token', async () => {
  const akun = akunBaru();
  await request(app).post('/auth/register').send(akun).expect(201);

  const res = await request(app)
    .post('/auth/login')
    .send({ email: akun.email, password: akun.password })
    .expect(200);

  assert.ok(res.body.data.token);
});

test('kata sandi salah dan e-mail asing memberi pesan yang sama persis', async () => {
  const akun = akunBaru();
  await request(app).post('/auth/register').send(akun).expect(201);

  const sandiSalah = await request(app)
    .post('/auth/login')
    .send({ email: akun.email, password: 'salah-sekali' })
    .expect(401);

  const emailAsing = await request(app)
    .post('/auth/login')
    .send({ email: 'tidak.ada@contoh.test', password: 'apa saja' })
    .expect(401);

  // Pesan yang berbeda akan membocorkan e-mail mana yang terdaftar.
  assert.strictEqual(sandiSalah.body.error.message, emailAsing.body.error.message);
});

test('/auth/me menolak permintaan tanpa token', async () => {
  await request(app).get('/auth/me').expect(401);
});

test('/auth/me menolak token yang dirusak', async () => {
  const akun = akunBaru();
  const daftar = await request(app).post('/auth/register').send(akun).expect(201);
  const rusak = `${daftar.body.data.token.slice(0, -4)}abcd`;

  await request(app).get('/auth/me').set('Authorization', `Bearer ${rusak}`).expect(401);
});

test('/auth/me menerima token lewat header maupun cookie', async () => {
  const akun = akunBaru();
  const daftar = await request(app).post('/auth/register').send(akun).expect(201);
  const { token } = daftar.body.data;

  const viaHeader = await request(app)
    .get('/auth/me')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  const viaCookie = await request(app)
    .get('/auth/me')
    .set('Cookie', `token=${token}`)
    .expect(200);

  assert.strictEqual(viaHeader.body.data.email, akun.email.toLowerCase());
  assert.strictEqual(viaCookie.body.data.email, akun.email.toLowerCase());
});
