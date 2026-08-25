'use strict';

const express = require('express');

const { requireJwt } = require('../middleware/jwtAuth');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireJwt, authController.me);

module.exports = router;
