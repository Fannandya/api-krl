'use strict';

const { ApiError } = require('../errors');
const {
  listStations, listStationsNear, getStationByCode,
} = require('../models/network');
const {
  floatParam, intParam, pagination, paginationMeta,
} = require('./_helpers');

/**
 * GET /v1/stations
 * Dua mode dalam satu endpoint: pencarian biasa, atau pencarian berdasarkan
 * kedekatan bila parameter "near" diberikan.
 */
exports.list = async (req, res) => {
  if (req.query.near) {
    const parts = String(req.query.near).split(',');
    if (parts.length !== 2) {
      throw ApiError.badRequest('Parameter "near" harus berupa "lintang,bujur", misalnya -6.21,106.85.');
    }
    const latitude = floatParam(parts[0], { name: 'near.lintang', min: -90, max: 90 });
    const longitude = floatParam(parts[1], { name: 'near.bujur', min: -180, max: 180 });
    const radiusKm = req.query.radius_km === undefined
      ? 5
      : floatParam(req.query.radius_km, { name: 'radius_km', min: 0.1, max: 200 });
    const limit = intParam(req.query.limit, { name: 'limit', min: 1, max: 100, fallback: 10 });

    const stations = await listStationsNear({ latitude, longitude, radiusKm, limit });
    return res.json({
      data: stations,
      meta: { mode: 'near', origin: { latitude, longitude }, radius_km: radiusKm, count: stations.length },
    });
  }

  const { limit, page, offset } = pagination(req.query);
  const { total, stations } = await listStations({
    search: req.query.search,
    lineCode: req.query.line,
    city: req.query.city,
    limit,
    offset,
  });

  return res.json({ data: stations, meta: paginationMeta({ total, page, limit }) });
};

/** GET /v1/stations/:code */
exports.show = async (req, res) => {
  const station = await getStationByCode(req.params.code);
  if (!station) {
    throw ApiError.notFound(`Stasiun dengan kode "${req.params.code}" tidak ditemukan.`);
  }
  return res.json({ data: station });
};
