'use strict';

/**
 * Batas hari untuk perhitungan kuota.
 *
 * Kuota harian harus berganti pada tengah malam waktu Jakarta, bukan tengah
 * malam waktu server. Di Vercel dan Supabase server berjalan dengan zona UTC,
 * sehingga tanpa penyesuaian ini kuota pengguna akan disetel ulang pukul tujuh
 * pagi WIB — di tengah jam sibuk.
 *
 * WIB tetap UTC+7 sepanjang tahun dan tidak mengenal waktu musim panas, jadi
 * pergeserannya bisa diperlakukan sebagai angka tetap.
 */

const TIMEZONE = 'Asia/Jakarta';
const OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Potongan SQL: awal hari berjalan menurut waktu Jakarta, sebagai timestamptz. */
const DAY_START_SQL =
  `(date_trunc('day', now() AT TIME ZONE '${TIMEZONE}') AT TIME ZONE '${TIMEZONE}')`;

/** Tengah malam Jakarta berikutnya — saat kuota disetel ulang. */
function nextQuotaReset(from = Date.now()) {
  const jakartaNow = from + OFFSET_MS;
  const nextMidnight = Math.ceil((jakartaNow + 1) / DAY_MS) * DAY_MS;
  return new Date(nextMidnight - OFFSET_MS);
}

module.exports = { TIMEZONE, DAY_START_SQL, nextQuotaReset };
