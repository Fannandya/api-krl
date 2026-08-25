'use strict';

const express = require('express');

const { requireJwt } = require('../middleware/jwtAuth');
const keyController = require('../controllers/keyController');

const router = express.Router();

// Seluruh endpoint di sini milik pemilik akun, jadi wajib JWT.
router.use(requireJwt);

// Jalur tetap ('/plans', '/usage') didaftarkan sebelum jalur berparameter
// supaya tidak tertelan oleh pola '/:id'.
router.get('/', keyController.list);
router.get('/plans', keyController.plans);
router.get('/usage', keyController.usage);
router.post('/', keyController.create);
router.get('/:id/usage', keyController.keyUsage);
router.delete('/:id', keyController.revoke);

module.exports = router;
