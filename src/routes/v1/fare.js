'use strict';

const express = require('express');
const fareController = require('../../controllers/fareController');

const router = express.Router();

router.get('/', fareController.show);

module.exports = router;
