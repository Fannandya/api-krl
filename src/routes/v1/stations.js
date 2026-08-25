'use strict';

const express = require('express');
const stationController = require('../../controllers/stationController');

const router = express.Router();

router.get('/', stationController.list);
router.get('/:code', stationController.show);

module.exports = router;
