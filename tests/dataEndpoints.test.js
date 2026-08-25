'use strict';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

const { resetDatabase, closeDatabase, uniqueEmail } = require('./helpers/env');
const { clearNetworkCache } = require('../src/services/networkCache');
const { createApp } = require('../src/app');

const app = createApp();

let key;

/** Satu akun dan satu API key dipakai bersama oleh seluruh kasus di berkas ini. */
test.before(async () => {
  await resetDatabase();
  clearNetworkCache();

  const daftar = await request(app)
    .post('/auth/register')
    .send({ email: uniqueEmail(), password: 'katasandi123', full_name: 'Pemakai Data' })
    .expect(201);

  const dibuat = await request(app)
    .post('/keys')
    .set('Authorization', `Bearer ${daftar.body.data.token}`)
    .send({ name: 'Key Data' })
    .expect(201);

  key = dibuat.body.data.key;
});

test.after(async () => { await closeDatabase(); });

const ambil = (path) => request(app).get(path).set('X-API-Key', key);
const kirim = (path, body) => request(app).post(path).set('X-API-Key', key).send(body);

// --- stasiun --------------------------------------------------------------

test('daftar stasiun terpaginasi dan membawa lin yang melayaninya', async () => {
  const res = await ambil('/v1/stations?limit=5').expect(200);

  assert.strictEqual(res.body.data.length, 5);
  assert.strictEqual(res.body.meta.total, 74);
  assert.strictEqual(res.body.meta.has_next, true);
  assert.ok(Array.isArray(res.body.data[0].lines));
});

test('halaman kedua berisi stasiun yang berbeda dari halaman pertama', async () => {
  const satu = await ambil('/v1/stations?limit=5&page=1').expect(200);
  const dua = await ambil('/v1/stations?limit=5&page=2').expect(200);

  const kodeSatu = satu.body.data.map((s) => s.code);
  const kodeDua = dua.body.data.map((s) => s.code);
  assert.ok(kodeDua.every((k) => !kodeSatu.includes(k)));
});

test('penyaringan menurut lin hanya mengembalikan stasiun di lin itu', async () => {
  const res = await ambil('/v1/stations?line=TNG&limit=100').expect(200);

  assert.strictEqual(res.body.meta.total, 11);
  assert.ok(res.body.data.every((s) => s.lines.includes('TNG')));
});

test('pencarian nama tidak membedakan huruf besar kecil', async () => {
  const res = await ambil('/v1/stations?search=MANGGARAI').expect(200);
  assert.strictEqual(res.body.data[0].code, 'MRI');
});

test('pencarian terdekat mengurutkan dari yang paling dekat', async () => {
  const res = await ambil('/v1/stations?near=-6.21,106.85&radius_km=5&limit=5').expect(200);

  assert.strictEqual(res.body.data[0].code, 'MRI');
  const jarak = res.body.data.map((s) => s.distance_km);
  assert.deepStrictEqual(jarak, [...jarak].sort((a, b) => a - b));
  assert.ok(jarak.every((d) => d <= 5));
});

test('parameter near yang salah bentuk ditolak', async () => {
  await ambil('/v1/stations?near=jakarta').expect(400);
  await ambil('/v1/stations?near=999,999').expect(400);
});

test('detail stasiun transit menyebut semua lin dan stasiun tetangganya', async () => {
  const res = await ambil('/v1/stations/mri').expect(200);

  assert.strictEqual(res.body.data.name, 'Manggarai');
  assert.strictEqual(res.body.data.is_interchange, true);
  assert.deepStrictEqual(
    res.body.data.served_by.map((l) => l.line_code).sort(),
    ['BOG', 'BST', 'CKR']
  );

  const bogor = res.body.data.served_by.find((l) => l.line_code === 'BOG');
  assert.strictEqual(bogor.previous_station.code, 'TEB');
  assert.strictEqual(bogor.next_station.code, 'CKI');
});

test('stasiun awal sebuah lin tidak punya perhentian sebelumnya', async () => {
  const res = await ambil('/v1/stations/BOO').expect(200);
  const bogor = res.body.data.served_by.find((l) => l.line_code === 'BOG');
  assert.strictEqual(bogor.previous_station, null);
  assert.strictEqual(bogor.stop_order, 1);
});

// --- lin ------------------------------------------------------------------

test('daftar lin memuat jumlah stasiun dan panjang jalur', async () => {
  const res = await ambil('/v1/lines').expect(200);

  assert.strictEqual(res.body.data.length, 6);
  const bogor = res.body.data.find((l) => l.code === 'BOG');
  assert.strictEqual(bogor.station_count, 24);
  assert.strictEqual(bogor.length_km, 51.2);
});

test('detail lin mengembalikan perhentian dalam urutan yang benar', async () => {
  const res = await ambil('/v1/lines/BOG').expect(200);
  const stasiun = res.body.data.stations;

  assert.strictEqual(stasiun[0].code, 'BOO');
  assert.strictEqual(stasiun[stasiun.length - 1].code, 'JAKK');
  assert.deepStrictEqual(
    stasiun.map((s) => s.stop_order),
    stasiun.map((_, i) => i + 1)
  );

  // Jarak kumulatif harus naik terus, tidak boleh mundur.
  const km = stasiun.map((s) => s.distance_km_from_origin);
  assert.deepStrictEqual(km, [...km].sort((a, b) => a - b));
});

// --- jadwal ---------------------------------------------------------------

test('jadwal dibangkitkan berurutan dan menghormati parameter after', async () => {
  const res = await ambil('/v1/schedules?station=BOO&after=07:00&limit=6&direction=up').expect(200);

  assert.strictEqual(res.body.data.length, 6);
  assert.ok(res.body.data.every((d) => d.time >= '07:00'));
  assert.ok(res.body.data.every((d) => d.direction === 'up'));

  const jam = res.body.data.map((d) => d.time);
  assert.deepStrictEqual(jam, [...jam].sort());
});

test('akhir pekan memakai headway yang berbeda dari hari kerja', async () => {
  const kerja = await ambil('/v1/schedules?station=BOO&day=weekday&after=07:00&limit=1').expect(200);
  const pekan = await ambil('/v1/schedules?station=BOO&day=weekend&after=07:00&limit=1').expect(200);

  assert.notStrictEqual(kerja.body.data[0].headway_minutes, pekan.body.data[0].headway_minutes);
});

test('jadwal untuk stasiun yang tidak ada menghasilkan 404', async () => {
  await ambil('/v1/schedules?station=ZZZ').expect(404);
});

// --- rute dan tarif -------------------------------------------------------

test('rute dalam satu lin tidak memerlukan transfer', async () => {
  const res = await kirim('/v1/route', { from: 'BOO', to: 'JAKK' }).expect(200);

  assert.strictEqual(res.body.data.transfers, 0);
  assert.strictEqual(res.body.data.legs.length, 1);
  assert.strictEqual(res.body.data.legs[0].line_code, 'BOG');
  assert.strictEqual(res.body.data.total_distance_km, 51.2);
});

test('rute lintas lin melaporkan transfer beserta waktunya', async () => {
  const res = await kirim('/v1/route', { from: 'BOO', to: 'THB' }).expect(200);
  const d = res.body.data;

  assert.strictEqual(d.transfers, 1);
  assert.strictEqual(d.legs.length, 2);
  assert.ok(d.transfer_minutes > 0, 'waktu pindah lin harus ikut dihitung');

  // Titik akhir leg pertama harus sama dengan titik awal leg kedua.
  assert.strictEqual(d.legs[0].to.code, d.legs[1].from.code);

  // Total waktu adalah jumlah waktu tiap leg ditambah waktu pindah.
  const jumlahLeg = d.legs.reduce((t, l) => t + l.minutes, 0);
  assert.strictEqual(d.total_minutes, jumlahLeg + d.transfer_minutes);
});

test('tarif dihitung dari jarak total perjalanan, bukan per leg', async () => {
  const res = await kirim('/v1/route', { from: 'BOO', to: 'THB' }).expect(200);
  const { fare, total_distance_km: jarak } = res.body.data;

  // Satu komponen saja: seluruh leg berada dalam satu jaringan Commuter Line.
  assert.strictEqual(fare.components.length, 1);
  assert.strictEqual(fare.components[0].distance_km, jarak);

  // Rp3.000 untuk 25 km pertama, lalu Rp1.000 tiap 10 km berikutnya.
  const langkah = Math.ceil((jarak - 25) / 10);
  assert.strictEqual(fare.total_idr, 3000 + langkah * 1000);
});

test('lin bertarif sendiri ditagih terpisah dari jaringan', async () => {
  const res = await kirim('/v1/route', { from: 'BOO', to: 'BST' }).expect(200);
  const { fare } = res.body.data;

  assert.strictEqual(fare.components.length, 2);
  const bandara = fare.components.find((c) => c.lines.includes('BST'));
  assert.strictEqual(bandara.amount_idr, 70000);
  assert.strictEqual(fare.total_idr, fare.components.reduce((t, c) => t + c.amount_idr, 0));
});

test('rute juga bisa diminta lewat GET', async () => {
  const res = await ambil('/v1/route?from=BOO&to=JAKK').expect(200);
  assert.strictEqual(res.body.data.legs.length, 1);
});

test('rute bolak-balik menempuh jarak yang sama', async () => {
  const pergi = await kirim('/v1/route', { from: 'BOO', to: 'THB' }).expect(200);
  const pulang = await kirim('/v1/route', { from: 'THB', to: 'BOO' }).expect(200);

  assert.strictEqual(pergi.body.data.total_distance_km, pulang.body.data.total_distance_km);
  assert.strictEqual(pergi.body.data.fare.total_idr, pulang.body.data.fare.total_idr);
});

test('depart_at menyertakan tiga keberangkatan berikutnya', async () => {
  const res = await kirim('/v1/route', { from: 'BOO', to: 'MRI', depart_at: '07:00' }).expect(200);

  assert.strictEqual(res.body.data.next_departures.length, 3);
  assert.ok(res.body.data.next_departures.every((d) => d.time >= '07:00'));
});

test('permintaan rute yang tidak masuk akal ditolak dengan kode yang tepat', async () => {
  await kirim('/v1/route', { from: 'BOO' }).expect(400);
  await kirim('/v1/route', { from: 'BOO', to: 'BOO' }).expect(400);
  await kirim('/v1/route', { from: 'BOO', to: 'ZZZ' }).expect(404);
});

test('endpoint tarif memberi rincian perhitungannya', async () => {
  const res = await ambil('/v1/fare?from=BOO&to=JAKK').expect(200);

  assert.strictEqual(res.body.data.total_idr, 6000);
  assert.match(res.body.data.components[0].breakdown, /25 km pertama/);
});

// --- statistik ------------------------------------------------------------

test('statistik jaringan cocok dengan isi basis data', async () => {
  const res = await ambil('/v1/stats').expect(200);

  assert.deepStrictEqual(res.body.data, {
    station_count: 74,
    line_count: 6,
    interchange_count: 6,
    stop_count: 82,
    city_count: 14,
    total_length_km: 234.6,
  });
});
