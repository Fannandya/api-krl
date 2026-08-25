'use strict';

const express = require('express');

const { requireJwt } = require('../../middleware/jwtAuth');
const { requireApiKey, requireApiKeyOwner } = require('../../middleware/apiKeyAuth');
const { enforceQuota } = require('../../middleware/quota');
const { logApiRequest } = require('../../middleware/requestLogger');

const stations = require('./stations');
const lines = require('./lines');
const schedules = require('./schedules');
const routing = require('./route');
const fare = require('./fare');
const stats = require('./stats');

const router = express.Router();

// Endpoint data menuntut dua kredensial sekaligus: pemakainya harus sudah masuk
// (JWT) dan menyertakan API key miliknya sendiri.
//
// Pencatat dipasang paling awal karena ia hanya menitipkan pendengar pada
// event 'finish'; isi catatannya baru dibaca setelah respons selesai. Dengan
// urutan ini, permintaan yang ditolak karena kuota habis pun tetap tercatat.
//
// requireJwt mendahului requireApiKey supaya pengunjung yang belum masuk
// mendapat jawaban tentang sesinya, bukan tentang API key yang belum tentu ia
// punya.
router.use(logApiRequest, requireJwt, requireApiKey, requireApiKeyOwner, enforceQuota);

router.use('/stations', stations);
router.use('/lines', lines);
router.use('/schedules', schedules);
router.use('/route', routing);
router.use('/fare', fare);
router.use('/stats', stats);

module.exports = router;
