'use strict';

require('dotenv').config();

const REQUIRED = ['DATABASE_URL', 'JWT_SECRET'];

/**
 * Baca dan validasi environment variable saat boot.
 * Sengaja gagal keras di sini supaya kesalahan konfigurasi terlihat sebagai
 * error yang jelas, bukan sebagai `undefined` misterius di tengah request.
 */
function loadConfig() {
  const missing = REQUIRED.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Environment variable belum diisi: ${missing.join(', ')}. ` +
        'Salin .env.example menjadi .env lalu isi nilainya.'
    );
  }

  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET harus minimal 32 karakter.');
  }

  // Masa berlaku token dipakai di tiga tempat (penandatanganan, umur cookie,
  // dan medan expires_in pada respons), jadi ia dibaca sekali di sini supaya
  // ketiganya tidak bisa saling menyimpang.
  const jwtExpiresSeconds = Number(process.env.JWT_EXPIRES || 3600);
  if (!Number.isInteger(jwtExpiresSeconds) || jwtExpiresSeconds <= 0) {
    throw new Error(
      'JWT_EXPIRES harus bilangan bulat positif dalam satuan detik, misalnya 3600 untuk 1 jam.'
    );
  }

  return {
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresSeconds,
    nodeEnv: process.env.NODE_ENV || 'development',
    appUrl: process.env.APP_URL || 'http://localhost:3000',
    port: Number(process.env.PORT || 3000),
    isProduction: process.env.NODE_ENV === 'production',
  };
}

module.exports = { loadConfig };
