'use strict';

const { getAllLineStations, getActiveFareRules } = require('../models/network');
const { buildGraph } = require('./graph');

/**
 * Jaringan KRL nyaris tidak pernah berubah, sedangkan graf dan aturan tarif
 * dibutuhkan pada setiap permintaan rute. Menyimpannya sebentar di memori
 * menghindarkan pembacaan ulang seluruh tabel line_stations setiap kali.
 *
 * Di Vercel setiap instance serverless punya memorinya sendiri dan berumur
 * pendek, jadi cache ini paling menolong saat instance sedang hangat dan
 * dengan sendirinya hilang saat instance berakhir.
 */

const TTL_MS = 5 * 60 * 1000;

let cache = null;

async function getNetwork() {
  const now = Date.now();
  if (cache && now - cache.loadedAt < TTL_MS) return cache.value;

  const [lineStations, fareRules] = await Promise.all([
    getAllLineStations(),
    getActiveFareRules(new Date()),
  ]);

  const value = { graph: buildGraph(lineStations), fareRules };
  cache = { value, loadedAt: now };
  return value;
}

/** Dipakai pengujian agar tiap kasus mulai dari keadaan bersih. */
function clearNetworkCache() {
  cache = null;
}

module.exports = { getNetwork, clearNetworkCache };
