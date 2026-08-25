'use strict';

/**
 * Titik masuk untuk Vercel. Seluruh permintaan diarahkan ke berkas ini lewat
 * rewrite di vercel.json, lalu Express yang menentukan rutenya.
 *
 * Aplikasi dibuat sekali per instance serverless dan dipakai ulang selama
 * instance itu masih hangat.
 */

const { createApp } = require('../src/app');

module.exports = createApp();
