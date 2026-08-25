'use strict';

const crypto = require('crypto');

/**
 * Pembuatan dan verifikasi API key.
 *
 * API key yang disimpan di basis data hanyalah hash SHA-256-nya. Nilai asli
 * ditampilkan sekali saja saat dibuat dan setelah itu tidak bisa dipulihkan,
 * sehingga bocornya isi tabel tidak dengan sendirinya membocorkan API key.
 *
 * Dipakai SHA-256, bukan bcrypt seperti pada kata sandi, karena API key
 * diverifikasi pada setiap permintaan API. Bcrypt sengaja dibuat lambat dan
 * akan menjadi beban di jalur terpanas ini. Perlambatan itu memang berguna
 * untuk kata sandi buatan manusia yang bisa ditebak, tetapi tidak diperlukan
 * di sini karena API key berisi 128 bit acak yang mustahil ditebak.
 */

const PREFIX = 'krl_live_';
const RANDOM_BYTES = 16; // 128 bit

function generateApiKey() {
  const secret = crypto.randomBytes(RANDOM_BYTES).toString('hex');
  const key = `${PREFIX}${secret}`;
  return {
    key,
    keyHash: hashApiKey(key),
    // Cukup panjang untuk dikenali pengguna, terlalu pendek untuk dipakai.
    keyPrefix: key.slice(0, 13),
  };
}

function hashApiKey(key) {
  return crypto.createHash('sha256').update(String(key).trim()).digest('hex');
}

function looksLikeApiKey(value) {
  return typeof value === 'string' && new RegExp(`^${PREFIX}[0-9a-f]{${RANDOM_BYTES * 2}}$`).test(value.trim());
}

/** Bentuk yang aman ditampilkan: krl_live_abcd...wxyz */
function maskApiKey(keyPrefix) {
  return `${keyPrefix}${'*'.repeat(8)}`;
}

module.exports = { generateApiKey, hashApiKey, looksLikeApiKey, maskApiKey, PREFIX };
