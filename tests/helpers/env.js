'use strict';

/**
 * Menyiapkan lingkungan untuk pengujian integrasi.
 *
 * Dimuat sebelum modul apa pun yang membaca konfigurasi, karena config.js
 * membaca process.env saat pertama dipanggil dan pool basis data menyimpan
 * koneksinya untuk seterusnya.
 */

const fs = require('fs');
const path = require('path');

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://postgres@127.0.0.1:55432/krl_test';
process.env.JWT_SECRET = 'secret-uji-yang-panjangnya-lebih-dari-tiga-puluh-dua';
process.env.NODE_ENV = 'test';
process.env.APP_URL = 'http://localhost:3000';

const { getPool, query } = require('../../src/config/database');

const root = path.join(__dirname, '..', '..');

/** Bangun ulang basis data uji dari nol supaya tiap berkas uji mulai bersih. */
async function resetDatabase() {
  await query(fs.readFileSync(path.join(root, 'db', 'schema.sql'), 'utf8'));
  await query(fs.readFileSync(path.join(root, 'db', 'seed.sql'), 'utf8'));
}

async function closeDatabase() {
  await getPool().end();
}

/** E-mail unik per pemanggilan supaya kasus uji tidak saling bertabrakan. */
let counter = 0;
function uniqueEmail() {
  counter += 1;
  return `uji${counter}.${Date.now()}@contoh.test`;
}

module.exports = { resetDatabase, closeDatabase, uniqueEmail, query };
