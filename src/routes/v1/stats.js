'use strict';

const express = require('express');
const statsController = require('../../controllers/statsController');

const router = express.Router();

router.get('/', statsController.show);

module.exports = router;
