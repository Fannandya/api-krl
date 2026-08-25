'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  calculateFare,
  calculateItineraryFare,
} = require('../src/services/fareCalculator');

const COMMUTER_RULE = {
  name: 'Tarif Commuter Line',
  baseFareIdr: 3000,
  baseDistanceKm: 25,
  incrementFareIdr: 1000,
  incrementDistanceKm: 10,
};

const AIRPORT_RULE = {
  name: 'Tarif KA Bandara Soekarno-Hatta',
  baseFareIdr: 70000,
  baseDistanceKm: 100,
  incrementFareIdr: 0,
  incrementDistanceKm: 10,
};

test('perjalanan sangat pendek dikenai tarif dasar', () => {
  assert.strictEqual(calculateFare(0, COMMUTER_RULE).amountIdr, 3000);
  assert.strictEqual(calculateFare(4.2, COMMUTER_RULE).amountIdr, 3000);
});

test('jarak tepat di batas jarak dasar masih tarif dasar', () => {
  assert.strictEqual(calculateFare(25, COMMUTER_RULE).amountIdr, 3000);
});

test('melewati batas jarak dasar sedikit saja sudah menambah satu increment', () => {
  assert.strictEqual(calculateFare(25.1, COMMUTER_RULE).amountIdr, 4000);
});

test('increment dihitung per kelipatan penuh yang dibulatkan ke atas', () => {
  assert.strictEqual(calculateFare(35, COMMUTER_RULE).amountIdr, 4000);
  assert.strictEqual(calculateFare(35.5, COMMUTER_RULE).amountIdr, 5000);
  assert.strictEqual(calculateFare(45, COMMUTER_RULE).amountIdr, 5000);
});

test('Bogor - Jakarta Kota sepanjang 51,20 km dikenai Rp6.000', () => {
  // 25 km pertama Rp3.000, sisa 26,20 km -> 3 x 10 km -> Rp3.000
  const result = calculateFare(51.2, COMMUTER_RULE);
  assert.strictEqual(result.amountIdr, 6000);
  assert.match(result.breakdown, /Rp3\.000/);
});

test('aturan tarif tetap tidak pernah menambah biaya', () => {
  assert.strictEqual(calculateFare(36.3, AIRPORT_RULE).amountIdr, 70000);
  assert.strictEqual(calculateFare(4.5, AIRPORT_RULE).amountIdr, 70000);
});

test('jarak negatif ditolak', () => {
  assert.throws(() => calculateFare(-1, COMMUTER_RULE), /jarak/i);
});

test('perjalanan satu lin jaringan memakai aturan jaringan', () => {
  const result = calculateItineraryFare(
    [{ lineCode: 'BOG', distanceKm: 51.2 }],
    { networkRule: COMMUTER_RULE, rulesByLineCode: {} }
  );
  assert.strictEqual(result.totalIdr, 6000);
  assert.strictEqual(result.components.length, 1);
});

test('beberapa leg pada lin jaringan digabung dulu baru dihitung sekali', () => {
  // 20 km + 20 km = 40 km -> Rp3.000 + 2 x Rp1.000 = Rp5.000.
  // Kalau tiap leg dihitung sendiri hasilnya keliru jadi 2 x Rp3.000 = Rp6.000.
  const result = calculateItineraryFare(
    [
      { lineCode: 'BOG', distanceKm: 20 },
      { lineCode: 'CKR', distanceKm: 20 },
    ],
    { networkRule: COMMUTER_RULE, rulesByLineCode: {} }
  );
  assert.strictEqual(result.totalIdr, 5000);
  assert.strictEqual(result.components.length, 1);
  assert.deepStrictEqual(result.components[0].lineCodes, ['BOG', 'CKR']);
});

test('lin bertarif sendiri ditagih terpisah dari jaringan', () => {
  const result = calculateItineraryFare(
    [
      { lineCode: 'BOG', distanceKm: 10 },
      { lineCode: 'BST', distanceKm: 36.3 },
    ],
    { networkRule: COMMUTER_RULE, rulesByLineCode: { BST: AIRPORT_RULE } }
  );
  assert.strictEqual(result.totalIdr, 73000);
  assert.strictEqual(result.components.length, 2);
});

test('perjalanan tanpa leg bertarif nol', () => {
  const result = calculateItineraryFare([], { networkRule: COMMUTER_RULE, rulesByLineCode: {} });
  assert.strictEqual(result.totalIdr, 0);
  assert.deepStrictEqual(result.components, []);
});
