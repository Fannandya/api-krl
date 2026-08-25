'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { buildGraph } = require('../src/services/graph');
const { findRoute } = require('../src/services/routeEngine');

// Jaringan fixture:
//
//   Lin A:  S1 --5km/10min-- S2 --5km/10min-- S3
//   Lin B:  S3 --4km/8min--- S4
//   Lin C:  S1 ------20km/15min------------- S4      (langsung tapi memutar)
//   Lin D:  S9 --3km/6min--- S10                     (terpisah dari sisanya)
//
//   S3 adalah stasiun transit, waktu pindah lin 5 menit.
function rows(overrides = {}) {
  const interchange = { S3: 5, ...(overrides.interchangeMinutes || {}) };
  const raw = [
    ['A', 'S1', 1, 0, 0], ['A', 'S2', 2, 5, 10], ['A', 'S3', 3, 10, 10],
    ['B', 'S3', 1, 0, 0], ['B', 'S4', 2, 4, 8],
    ['C', 'S1', 1, 0, 0], ['C', 'S4', 2, 20, 15],
    ['D', 'S9', 1, 0, 0], ['D', 'S10', 2, 3, 6],
  ].filter((r) => !(overrides.excludeLines || []).includes(r[0]));

  return raw.map(([lineCode, stationCode, stopOrder, distanceKm, travelMinutesFromPrev]) => ({
    lineCode,
    lineName: `Lin ${lineCode}`,
    stationCode,
    stationName: `Stasiun ${stationCode}`,
    stopOrder,
    distanceKm,
    travelMinutesFromPrev,
    interchangeMinutes: interchange[stationCode] ?? 5,
  }));
}

test('graf mengenali setiap kombinasi stasiun dan lin sebagai simpul tersendiri', () => {
  const graph = buildGraph(rows());
  // S1 dilayani lin A dan C, jadi ada dua simpul untuk stasiun yang sama.
  assert.deepStrictEqual(graph.linesAtStation('S1').sort(), ['A', 'C']);
  assert.deepStrictEqual(graph.linesAtStation('S3').sort(), ['A', 'B']);
});

test('rute dalam satu lin tidak menghasilkan transfer', () => {
  const route = findRoute(buildGraph(rows()), 'S1', 'S3');
  assert.strictEqual(route.transfers, 0);
  assert.strictEqual(route.legs.length, 1);
  assert.strictEqual(route.totalMinutes, 20);
  assert.strictEqual(route.totalDistanceKm, 10);
  assert.deepStrictEqual(route.legs[0].stationCodes, ['S1', 'S2', 'S3']);
  assert.strictEqual(route.legs[0].stops, 2);
});

test('rute berlaku dua arah', () => {
  const route = findRoute(buildGraph(rows()), 'S3', 'S1');
  assert.strictEqual(route.totalMinutes, 20);
  assert.deepStrictEqual(route.legs[0].stationCodes, ['S3', 'S2', 'S1']);
});

test('waktu pindah lin ikut dihitung dalam total waktu', () => {
  // Tanpa lin C, satu-satunya jalan S1 -> S4 adalah lewat transfer di S3.
  // 20 menit (lin A) + 5 menit pindah + 8 menit (lin B) = 33 menit.
  const route = findRoute(buildGraph(rows({ excludeLines: ['C'] })), 'S1', 'S4');
  assert.strictEqual(route.transfers, 1);
  assert.strictEqual(route.legs.length, 2);
  assert.strictEqual(route.totalMinutes, 33);
  assert.strictEqual(route.totalDistanceKm, 14);
  assert.strictEqual(route.transferMinutes, 5);
  assert.deepStrictEqual(route.legs.map((l) => l.lineCode), ['A', 'B']);
});

test('rute yang lebih jauh tetap dipilih bila waktunya lebih singkat', () => {
  // Lin C memutar 20 km tetapi hanya 15 menit, kalah jarak namun menang waktu
  // melawan 14 km / 33 menit lewat transfer.
  const route = findRoute(buildGraph(rows()), 'S1', 'S4');
  assert.strictEqual(route.totalMinutes, 15);
  assert.strictEqual(route.totalDistanceKm, 20);
  assert.strictEqual(route.transfers, 0);
});

test('waktu pindah lin yang mahal membalikkan pilihan rute', () => {
  // Dengan transfer 5 menit, jalur A+B berbiaya 33 menit dan lin C 15 menit.
  // Naikkan transfer jadi 60 menit: A+B jadi 88 menit, lin C tetap menang.
  // Sebaliknya bila transfer nol, A+B jadi 28 menit dan masih kalah dari 15.
  // Uji langsung pengaruhnya pada total waktu jalur transfer.
  const murah = findRoute(buildGraph(rows({ excludeLines: ['C'], interchangeMinutes: { S3: 0 } })), 'S1', 'S4');
  const mahal = findRoute(buildGraph(rows({ excludeLines: ['C'], interchangeMinutes: { S3: 60 } })), 'S1', 'S4');
  assert.strictEqual(murah.totalMinutes, 28);
  assert.strictEqual(mahal.totalMinutes, 88);
});

test('leg mencatat jarak dan waktu per lin', () => {
  const route = findRoute(buildGraph(rows({ excludeLines: ['C'] })), 'S1', 'S4');
  assert.deepStrictEqual(
    route.legs.map((l) => ({ line: l.lineCode, km: l.distanceKm, menit: l.minutes })),
    [
      { line: 'A', km: 10, menit: 20 },
      { line: 'B', km: 4, menit: 8 },
    ]
  );
});

test('stasiun yang tidak terhubung menghasilkan null', () => {
  assert.strictEqual(findRoute(buildGraph(rows()), 'S1', 'S9'), null);
});

test('kode stasiun yang tidak ada ditolak', () => {
  const graph = buildGraph(rows());
  assert.throws(() => findRoute(graph, 'XX', 'S1'), (err) => err.code === 'unknown_station');
  assert.throws(() => findRoute(graph, 'S1', 'XX'), (err) => err.code === 'unknown_station');
});

test('asal dan tujuan yang sama ditolak', () => {
  const graph = buildGraph(rows());
  assert.throws(() => findRoute(graph, 'S1', 'S1'), (err) => err.code === 'same_station');
});
