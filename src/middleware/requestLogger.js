'use strict';

const { insertRequestLog } = require('../models/logs');

/**
 * Mencatat setiap permintaan ber-API-key ke request_logs.
 *
 * Penulisan dilakukan setelah respons terkirim (event 'finish'), sehingga
 * penambahan catatan tidak menambah waktu tunggu yang dirasakan pemanggil.
 * Kegagalan mencatat sengaja hanya dilaporkan ke konsol: permintaan yang sudah
 * berhasil dilayani tidak pantas dianggap gagal hanya karena logging bermasalah.
 */
function logApiRequest(req, res, next) {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    if (!req.apiKey) return;

    const latencyMs = Number((process.hrtime.bigint() - startedAt) / 1000000n);

    insertRequestLog({
      apiKeyId: req.apiKey.id,
      endpoint: req.baseUrl + (req.route ? req.route.path : req.path),
      method: req.method,
      statusCode: res.statusCode,
      latencyMs,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    }).catch((err) => console.error('Gagal mencatat request_logs:', err.message));
  });

  next();
}

module.exports = { logApiRequest };
