'use strict';

const express = require('express');
const lineController = require('../../controllers/lineController');

const router = express.Router();

router.get('/', lineController.list);
router.get('/:code', lineController.show);

module.exports = router;
