'use strict';

const { ApiError } = require('../errors');
const { verifyToken, extractToken } = require('../services/auth');

/** Wajib login. Menolak permintaan tanpa token yang sah. */
function requireJwt(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return next(ApiError.unauthorized('Silakan masuk terlebih dahulu.'));
  }

  const payload = verifyToken(token);
  if (!payload) {
    return next(ApiError.unauthorized('Sesi tidak sah atau sudah kedaluwarsa.'));
  }

  req.user = { id: payload.sub, email: payload.email, fullName: payload.name };
  return next();
}

/**
 * Tidak mewajibkan login, tetapi mengisi req.user bila tokennya ada.
 * Dipakai halaman publik agar bisa menampilkan menu yang sesuai.
 */
function optionalJwt(req, res, next) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  req.user = payload ? { id: payload.sub, email: payload.email, fullName: payload.name } : null;
  return next();
}

/**
 * Versi untuk halaman web. Pengunjung yang belum masuk diarahkan ke halaman
 * masuk, bukan disodori halaman error — 401 adalah jawaban yang tepat untuk
 * program, tetapi buntu bagi orang yang sedang membuka peramban.
 */
function requireJwtPage(req, res, next) {
  if (!req.user) {
    return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
  }
  return next();
}

module.exports = { requireJwt, optionalJwt, requireJwtPage };
