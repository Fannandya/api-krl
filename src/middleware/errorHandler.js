'use strict';

const { ApiError } = require('../errors');

function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Endpoint ${req.method} ${req.path} tidak ada.`));
}

/**
 * Postgres menolak teks yang tidak berbentuk UUID dengan kode 22P02. Itu bukan
 * kerusakan server melainkan masukan pemanggil yang keliru, jadi diterjemahkan
 * menjadi 400 alih-alih 500.
 */
function normalize(err) {
  if (err && err.code === '22P02') {
    return ApiError.badRequest('Format pengenal tidak sah. Nilai yang diharapkan berupa UUID.');
  }
  return err;
}

// eslint-disable-next-line no-unused-vars -- Express mengenali error handler dari 4 argumen
function errorHandler(rawError, req, res, next) {
  const err = normalize(rawError);
  const isApiError = err instanceof ApiError;
  const statusCode = isApiError ? err.statusCode : 500;

  if (!isApiError) {
    console.error('Unhandled error:', err);
  }

  // Permintaan halaman dashboard mendapat HTML, permintaan API mendapat JSON.
  const wantsHtml = req.accepts(['json', 'html']) === 'html' && !req.path.startsWith('/v1');
  if (wantsHtml) {
    return res.status(statusCode).render('error', {
      title: `Error ${statusCode}`,
      statusCode,
      message: isApiError ? err.message : 'Terjadi kesalahan pada server.',
      user: req.user || null,
    });
  }

  return res.status(statusCode).json({
    error: {
      code: isApiError ? err.code : 'internal_server_error',
      message: isApiError ? err.message : 'Terjadi kesalahan pada server.',
      ...(isApiError && err.details ? { details: err.details } : {}),
    },
  });
}

module.exports = { notFoundHandler, errorHandler };
