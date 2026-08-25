'use strict';

const { ApiError } = require('../errors');
const { getServicePatternsForStation, getStationByCode } = require('../models/network');
const { generateDepartures } = require('../services/scheduleGenerator');
const { enumParam, requiredParam, intParam } = require('./_helpers');

/**
 * GET /v1/schedules?station=BOO&day=weekday&after=07:00&limit=20
 *
 * Jam keberangkatan tidak disimpan sebagai baris tersendiri, melainkan
 * dibangkitkan dari pola operasi di tabel service_patterns.
 */
exports.list = async (req, res) => {
  const stationCode = requiredParam(req.query.station, 'station').toUpperCase();
  const dayType = enumParam(req.query.day, {
    name: 'day', allowed: ['weekday', 'weekend'], fallback: 'weekday',
  });
  const limit = intParam(req.query.limit, { name: 'limit', min: 1, max: 200, fallback: 20 });
  const direction = enumParam(req.query.direction, {
    name: 'direction', allowed: ['up', 'down'], fallback: null,
  });

  const station = await getStationByCode(stationCode);
  if (!station) {
    throw ApiError.notFound(`Stasiun dengan kode "${stationCode}" tidak ditemukan.`);
  }

  let patterns = await getServicePatternsForStation({
    stationCode,
    dayType,
    lineCode: req.query.line,
  });
  if (direction) patterns = patterns.filter((p) => p.direction === direction);

  // parseTimeToMinutes melempar Error biasa; ubah jadi 400 yang informatif.
  let departures;
  try {
    departures = generateDepartures({ patterns, after: req.query.after, limit });
  } catch (err) {
    throw ApiError.badRequest(err.message);
  }

  return res.json({
    // Bentuk keluaran service memakai camelCase; API ini seragam snake_case.
    data: departures.map((d) => ({
      time: d.time,
      line_code: d.lineCode,
      line_name: d.lineName,
      direction: d.direction,
      day_type: d.dayType,
      headway_minutes: d.headwayMinutes,
    })),
    meta: {
      station: { code: station.code, name: station.name },
      day_type: dayType,
      after: req.query.after || null,
      direction: direction || 'semua',
      pattern_count: patterns.length,
      count: departures.length,
      note: 'Jam keberangkatan dibangkitkan dari pola headway, bukan jadwal resmi.',
    },
  });
};
