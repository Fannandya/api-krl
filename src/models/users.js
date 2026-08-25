'use strict';

const { query } = require('../config/database');

/** E-mail selalu disimpan dan dicari dalam huruf kecil. */
const normalizeEmail = (email) => String(email).trim().toLowerCase();

async function createUser({ email, passwordHash, fullName }) {
  const { rows } = await query(
    `INSERT INTO users (email, password_hash, full_name)
     VALUES ($1, $2, $3)
     RETURNING id, email, full_name, created_at`,
    [normalizeEmail(email), passwordHash, fullName]
  );
  return rows[0];
}

async function findUserByEmail(email) {
  const { rows } = await query(
    `SELECT id, email, password_hash, full_name, created_at
     FROM users WHERE email = $1`,
    [normalizeEmail(email)]
  );
  return rows[0] || null;
}

async function findUserById(id) {
  const { rows } = await query(
    `SELECT id, email, full_name, created_at FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function emailExists(email) {
  const { rows } = await query(`SELECT 1 FROM users WHERE email = $1`, [normalizeEmail(email)]);
  return rows.length > 0;
}

module.exports = { createUser, findUserByEmail, findUserById, emailExists, normalizeEmail };
