'use strict';

/**
 * Pembangkit jam keberangkatan. Fungsi murni.
 *
 * Basis data hanya menyimpan pola operasi — rentang jam beserta headway-nya —
 * bukan puluhan ribu baris jam keberangkatan. Jam keberangkatan dibangkitkan
 * di sini saat permintaan datang.
 */

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

function parseTimeToMinutes(value) {
  const match = TIME_PATTERN.exec(String(value).trim());
  if (!match) {
    throw new Error(`Format jam tidak dikenali: "${value}". Gunakan HH:MM, misalnya 07:30.`);
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatMinutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * @param {object}   input
 * @param {Array}    input.patterns  pola operasi dari tabel service_patterns
 * @param {string=}  input.after     hanya keberangkatan pada atau setelah jam ini
 * @param {number=}  input.limit     jumlah maksimum hasil
 */
function generateDepartures({ patterns, after, limit }) {
  const floor = after === undefined || after === null || after === ''
    ? 0
    : parseTimeToMinutes(after);

  const departures = [];

  for (const p of patterns) {
    const start = parseTimeToMinutes(p.startTime);
    const end = parseTimeToMinutes(p.endTime);

    // Rentang setengah terbuka [start, end): jam penutup adalah milik rentang
    // berikutnya, sehingga rentang yang bersambung tidak menghasilkan duplikat.
    for (let t = start; t < end; t += p.headwayMinutes) {
      if (t < floor) continue;
      departures.push({
        time: formatMinutesToTime(t),
        lineCode: p.lineCode,
        lineName: p.lineName,
        direction: p.direction,
        dayType: p.dayType,
        headwayMinutes: p.headwayMinutes,
      });
    }
  }

  departures.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));

  return typeof limit === 'number' ? departures.slice(0, limit) : departures;
}

module.exports = { generateDepartures, parseTimeToMinutes, formatMinutesToTime };
