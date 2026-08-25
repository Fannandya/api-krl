'use strict';

const express = require('express');

const { requireApiKey } = require('../../middleware/apiKeyAuth');
const { enforceQuota } = require('../../middleware/quota');
const { logApiRequest } = require('../../middleware/requestLogger');

const stations = require('./stations');
const lines = require('./lines');
const schedules = require('./schedules');
const routing = require('./route');
const fare = require('./fare');
const stats = require('./stats');

const router = express.Router();

// Pencatat dipasang paling awal karena ia hanya menitipkan pendengar pada
// event 'finish'; isi catatannya baru dibaca setelah respons selesai. Dengan
// urutan ini, permintaan yang ditolak karena kuota habis pun tetap tercatat.
router.use(logApiRequest, requireApiKey, enforceQuota);

router.use('/stations', stations);
router.use('/lines', lines);
router.use('/schedules', schedules);
router.use('/route', routing);
router.use('/fare', fare);
router.use('/stats', stats);

module.exports = router;
