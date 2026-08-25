'use strict';

const express = require('express');
const routeController = require('../../controllers/routeController');

const router = express.Router();

// Dua metode, satu handler: POST untuk badan JSON, GET untuk query string.
router.post('/', routeController.search);
router.get('/', routeController.search);

module.exports = router;
