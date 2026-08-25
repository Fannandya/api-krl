'use strict';

/**
 * Error yang aman ditampilkan ke klien. Apa pun yang bukan ApiError dianggap
 * bug internal dan detailnya tidak dibocorkan ke response.
 */
class ApiError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, 'bad_request', message, details);
  }

  static unauthorized(message = 'Autentikasi gagal.', details) {
    return new ApiError(401, 'unauthorized', message, details);
  }

  static forbidden(message = 'Akses ditolak.', details) {
    return new ApiError(403, 'forbidden', message, details);
  }

  static notFound(message = 'Data tidak ditemukan.', details) {
    return new ApiError(404, 'not_found', message, details);
  }

  static conflict(message, details) {
    return new ApiError(409, 'conflict', message, details);
  }

  static unprocessable(message, details) {
    return new ApiError(422, 'unprocessable_entity', message, details);
  }

  static quotaExceeded(message, details) {
    return new ApiError(429, 'quota_exceeded', message, details);
  }
}

module.exports = { ApiError };
