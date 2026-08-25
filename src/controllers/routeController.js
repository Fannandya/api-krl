'use strict';

const { ApiError } = require('../errors');
const { getNetwork } = require('../services/networkCache');
const { findRoute } = require('../services/routeEngine');
const { calculateItineraryFare } = require('../services/fareCalculator');
const { generateDepartures } = require('../services/scheduleGenerator');
const { getServicePatternsForStation } = require('../models/network');
const { requiredParam, enumParam } = require('./_helpers');

/** Ubah galat dari mesin rute menjadi respons HTTP yang tepat. */
function toApiError(err) {
  if (err.code === 'unknown_station') return ApiError.notFound(err.message);
  if (err.code === 'same_station') return ApiError.badRequest(err.message);
  return err;
}

/**
 * Dipakai oleh POST /v1/route maupun GET /v1/route, karena keduanya menjawab
 * pertanyaan yang sama — hanya cara mengirim parameternya yang berbeda.
 */
exports.search = async (req, res) => {
  const body = { ...req.query, ...req.body };
  const from = requiredParam(body.from, 'from').toUpperCase();
  const to = requiredParam(body.to, 'to').toUpperCase();
  const dayType = enumParam(body.day_type, {
    name: 'day_type', allowed: ['weekday', 'weekend'], fallback: 'weekday',
  });

  const { graph, fareRules } = await getNetwork();

  let itinerary;
  try {
    itinerary = findRoute(graph, from, to);
  } catch (err) {
    throw toApiError(err);
  }

  if (!itinerary) {
    throw ApiError.unprocessable(
      `Tidak ada rute yang menghubungkan ${from} dengan ${to} dalam jaringan ini.`,
      { from, to }
    );
  }

  const fare = calculateItineraryFare(
    itinerary.legs.map((leg) => ({ lineCode: leg.lineCode, distanceKm: leg.distanceKm })),
    fareRules
  );

  // Keberangkatan berikutnya dari stasiun asal pada lin yang akan dinaiki,
  // supaya jawaban rute langsung berguna tanpa perlu memanggil /v1/schedules.
  const firstLeg = itinerary.legs[0];
  const patterns = await getServicePatternsForStation({
    stationCode: from, dayType, lineCode: firstLeg.lineCode,
  });
  let nextDepartures = [];
  if (body.depart_at) {
    try {
      nextDepartures = generateDepartures({ patterns, after: body.depart_at, limit: 3 });
    } catch (err) {
      throw ApiError.badRequest(err.message);
    }
  }

  return res.json({
    data: {
      from: { code: firstLeg.fromCode, name: firstLeg.fromName },
      to: {
        code: itinerary.legs[itinerary.legs.length - 1].toCode,
        name: itinerary.legs[itinerary.legs.length - 1].toName,
      },
      total_minutes: itinerary.totalMinutes,
      total_distance_km: itinerary.totalDistanceKm,
      transfers: itinerary.transfers,
      transfer_minutes: itinerary.transferMinutes,
      legs: itinerary.legs.map((leg) => ({
        line_code: leg.lineCode,
        line_name: leg.lineName,
        from: { code: leg.fromCode, name: leg.fromName },
        to: { code: leg.toCode, name: leg.toName },
        stops: leg.stops,
        minutes: leg.minutes,
        distance_km: leg.distanceKm,
        stations: leg.stationCodes,
      })),
      fare: {
        total_idr: fare.totalIdr,
        components: fare.components.map((c) => ({
          rule: c.ruleName,
          lines: c.lineCodes,
          distance_km: c.distanceKm,
          amount_idr: c.amountIdr,
          breakdown: c.breakdown,
        })),
      },
      next_departures: nextDepartures.map((d) => ({
        time: d.time,
        line_code: d.lineCode,
        direction: d.direction,
      })),
    },
    meta: {
      day_type: dayType,
      optimized_for: 'waktu tempuh tersingkat, termasuk waktu pindah lin',
      note: 'Perkiraan berbasis data referensi akademik, bukan jadwal resmi KAI Commuter.',
    },
  });
};
