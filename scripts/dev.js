'use strict';

const { createApp } = require('../src/app');
const { loadConfig } = require('../src/config');

const config = loadConfig();
const app = createApp();

app.listen(config.port, () => {
  console.log(`KRL Data API berjalan di http://localhost:${config.port}`);
  console.log(`  Dashboard    : http://localhost:${config.port}/`);
  console.log(`  Dokumentasi  : http://localhost:${config.port}/docs`);
  console.log(`  Health check : http://localhost:${config.port}/health`);
});
