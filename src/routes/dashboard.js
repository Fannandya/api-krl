'use strict';

const express = require('express');

const { requireJwtPage } = require('../middleware/jwtAuth');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

router.get('/', dashboardController.home);
router.get('/login', dashboardController.loginPage);
router.get('/register', dashboardController.registerPage);
router.get('/dashboard', requireJwtPage, dashboardController.dashboard);
router.get('/docs', dashboardController.docs);

module.exports = router;
