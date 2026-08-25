'use strict';

const { ApiError } = require('../errors');
const { loadConfig } = require('../config');
const {
  hashPassword, verifyPassword, signToken, validateRegistration,
} = require('../services/auth');
const {
  createUser, findUserByEmail, findUserById, emailExists,
} = require('../models/users');

const COOKIE_NAME = 'token';

/**
 * Token dikirim dua kali: sebagai cookie httpOnly untuk dashboard di peramban,
 * dan di badan respons untuk klien seperti Postman. Cookie httpOnly tidak bisa
 * dibaca JavaScript sehingga aman dari pencurian lewat XSS, tetapi klien non
 * peramban memang butuh tokennya secara langsung.
 *
 * Umur cookie dan medan expires_in berasal dari satu nilai yang sama supaya
 * peramban dan klien program tidak pernah punya anggapan berbeda tentang kapan
 * sesinya berakhir.
 */
function issueSession(res, user) {
  const config = loadConfig();
  const token = signToken(user);

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    maxAge: config.jwtExpiresSeconds * 1000,
  });

  return { token, expiresIn: config.jwtExpiresSeconds };
}

/** POST /auth/register */
exports.register = async (req, res) => {
  const errors = validateRegistration(req.body || {});
  if (errors.length > 0) {
    throw ApiError.badRequest('Data pendaftaran belum lengkap atau tidak sah.', errors);
  }

  const { email, password, full_name: fullName } = req.body;

  if (await emailExists(email)) {
    throw ApiError.conflict('Alamat e-mail ini sudah terdaftar.');
  }

  const user = await createUser({
    email,
    passwordHash: await hashPassword(password),
    fullName: String(fullName).trim(),
  });

  const { token, expiresIn } = issueSession(res, user);

  return res.status(201).json({
    data: {
      user: { id: user.id, email: user.email, full_name: user.full_name },
      token,
      token_type: 'Bearer',
      expires_in: expiresIn,
    },
  });
};

/** POST /auth/login */
exports.login = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    throw ApiError.badRequest('E-mail dan kata sandi wajib diisi.');
  }

  const user = await findUserByEmail(email);

  // Pesan yang sama untuk e-mail tidak terdaftar maupun kata sandi salah,
  // supaya jawaban ini tidak bisa dipakai menebak e-mail mana yang terdaftar.
  const invalid = ApiError.unauthorized('E-mail atau kata sandi salah.');
  if (!user) throw invalid;
  if (!(await verifyPassword(password, user.password_hash))) throw invalid;

  const { token, expiresIn } = issueSession(res, user);

  return res.json({
    data: {
      user: { id: user.id, email: user.email, full_name: user.full_name },
      token,
      token_type: 'Bearer',
      expires_in: expiresIn,
    },
  });
};

/** POST /auth/logout */
exports.logout = (req, res) => {
  res.clearCookie(COOKIE_NAME);
  return res.json({ data: { message: 'Sesi diakhiri.' } });
};

/** GET /auth/me */
exports.me = async (req, res) => {
  const user = await findUserById(req.user.id);
  if (!user) throw ApiError.unauthorized('Akun tidak ditemukan.');
  return res.json({ data: user });
};

exports.COOKIE_NAME = COOKIE_NAME;
