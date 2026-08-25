'use strict';

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const { loadConfig } = require('./config');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { optionalJwt } = require('./middleware/jwtAuth');

const authRoutes = require('./routes/auth');
const keyRoutes = require('./routes/keys');
const dashboardRoutes = require('./routes/dashboard');
const v1Routes = require('./routes/v1');

function createApp() {
  const config = loadConfig();
  const app = express();

  // Vercel berada di depan aplikasi sebagai proksi; tanpa ini alamat IP yang
  // tercatat di request_logs akan selalu berupa alamat internal proksi.
  app.set('trust proxy', true);

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.locals.appUrl = config.appUrl;

  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h' }));

  app.get('/health', (req, res) => {
    res.json({
      data: {
        status: 'ok',
        service: 'KRL Data API',
        environment: config.nodeEnv,
        timestamp: new Date().toISOString(),
      },
    });
  });

  // Endpoint data: dilindungi API key, dikenai kuota, dan dicatat.
  app.use('/v1', v1Routes);

  // Pengelolaan akun dan API key: dilindungi JWT.
  app.use('/auth', authRoutes);
  app.use('/keys', keyRoutes);

  // Halaman web. optionalJwt supaya menu menyesuaikan status masuk pengguna.
  app.use('/', optionalJwt, dashboardRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
