'use strict';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const { loadConfig } = require('../config');

const BCRYPT_ROUNDS = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD_LENGTH = 8;

function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function signToken(user) {
  const config = loadConfig();
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.full_name },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

/** @returns {object|null} isi token, atau null bila tidak sah atau kedaluwarsa. */
function verifyToken(token) {
  try {
    return jwt.verify(token, loadConfig().jwtSecret);
  } catch {
    return null;
  }
}

/**
 * Validasi masukan pendaftaran. Mengembalikan daftar kesalahan agar pengguna
 * melihat semuanya sekaligus, bukan satu per satu setiap kali menekan kirim.
 */
function validateRegistration({ email, password, full_name: fullName }) {
  const errors = [];

  if (!email || !EMAIL_PATTERN.test(String(email).trim())) {
    errors.push({ field: 'email', message: 'Alamat e-mail tidak sah.' });
  }
  if (!password || String(password).length < MIN_PASSWORD_LENGTH) {
    errors.push({
      field: 'password',
      message: `Kata sandi minimal ${MIN_PASSWORD_LENGTH} karakter.`,
    });
  }
  if (!fullName || String(fullName).trim().length < 2) {
    errors.push({ field: 'full_name', message: 'Nama lengkap wajib diisi.' });
  }

  return errors;
}

/**
 * Ambil token dari cookie (dipakai dashboard) atau header Authorization
 * (dipakai klien seperti Postman). Satu pintu untuk dua cara pemakaian.
 */
function extractToken(req) {
  const header = req.get('authorization');
  if (header && header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  return null;
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  validateRegistration,
  extractToken,
  MIN_PASSWORD_LENGTH,
};
