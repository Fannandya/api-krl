'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  generateDepartures,
  parseTimeToMinutes,
  formatMinutesToTime,
} = require('../src/services/scheduleGenerator');

const pattern = (over) => ({
  lineCode: 'BOG',
  lineName: 'Lin Bogor',
  direction: 'up',
  dayType: 'weekday',
  startTime: '06:00:00',
  endTime: '09:00:00',
  headwayMinutes: 6,
  ...over,
});

test('jam diubah bolak-balik antara teks dan menit', () => {
  assert.strictEqual(parseTimeToMinutes('06:00'), 360);
  assert.strictEqual(parseTimeToMinutes('06:00:00'), 360);
  assert.strictEqual(parseTimeToMinutes('23:59'), 1439);
  assert.strictEqual(formatMinutesToTime(360), '06:00');
  assert.strictEqual(formatMinutesToTime(1439), '23:59');
});

test('format jam yang tidak sah ditolak', () => {
  assert.throws(() => parseTimeToMinutes('7 pagi'), /format jam/i);
  assert.throws(() => parseTimeToMinutes('25:00'), /format jam/i);
});

test('keberangkatan dibangkitkan sesuai headway', () => {
  const result = generateDepartures({ patterns: [pattern()] });
  assert.strictEqual(result[0].time, '06:00');
  assert.strictEqual(result[1].time, '06:06');
  assert.strictEqual(result[2].time, '06:12');
});

test('rentang bersifat setengah terbuka supaya tidak bentrok dengan rentang berikutnya', () => {
  // 06:00-09:00 headway 6 -> keberangkatan terakhir 08:54, bukan 09:00,
  // karena 09:00 adalah milik rentang berikutnya.
  const result = generateDepartures({ patterns: [pattern()] });
  assert.strictEqual(result.length, 30);
  assert.strictEqual(result[result.length - 1].time, '08:54');
});

test('beberapa pola digabung lalu diurutkan menurut waktu', () => {
  const result = generateDepartures({
    patterns: [
      pattern({ startTime: '09:00:00', endTime: '10:00:00', headwayMinutes: 30 }),
      pattern({ startTime: '06:00:00', endTime: '07:00:00', headwayMinutes: 30, lineCode: 'CKR' }),
    ],
  });
  assert.deepStrictEqual(
    result.map((d) => `${d.time} ${d.lineCode}`),
    ['06:00 CKR', '06:30 CKR', '09:00 BOG', '09:30 BOG']
  );
});

test('penyaring after membuang keberangkatan yang sudah lewat', () => {
  const result = generateDepartures({ patterns: [pattern()], after: '07:00' });
  assert.strictEqual(result[0].time, '07:00');
  assert.ok(result.every((d) => d.time >= '07:00'));
});

test('after yang jatuh di sela headway mengambil keberangkatan berikutnya', () => {
  const result = generateDepartures({ patterns: [pattern()], after: '07:01' });
  assert.strictEqual(result[0].time, '07:06');
});

test('limit memotong jumlah hasil', () => {
  const result = generateDepartures({ patterns: [pattern()], limit: 3 });
  assert.strictEqual(result.length, 3);
});

test('setiap keberangkatan membawa identitas lin dan arahnya', () => {
  const [first] = generateDepartures({ patterns: [pattern()], limit: 1 });
  assert.deepStrictEqual(first, {
    time: '06:00',
    lineCode: 'BOG',
    lineName: 'Lin Bogor',
    direction: 'up',
    dayType: 'weekday',
    headwayMinutes: 6,
  });
});

test('tanpa pola hasilnya kosong', () => {
  assert.deepStrictEqual(generateDepartures({ patterns: [] }), []);
});
