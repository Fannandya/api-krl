'use strict';

const { ApiError } = require('../errors');
const { getNetwork } = require('../services/networkCache');
const { findRoute } = require('../services/routeEngine');
const { calculateItineraryFare } = require('../services/fareCalculator');
const { requiredParam } = require('./_helpers');

/**
 * GET /v1/fare?from=BOO&to=THB
 * Hanya bagian tarifnya, untuk pemanggil yang tidak butuh rincian rute.
 */
exports.show = async (req, res) => {
  const from = requiredParam(req.query.from, 'from').toUpperCase();
  const to = requiredParam(req.query.to, 'to').toUpperCase();

  const { graph, fareRules } = await getNetwork();

  let itinerary;
  try {
    itinerary = findRoute(graph, from, to);
  } catch (err) {
    if (err.code === 'unknown_station') throw ApiError.notFound(err.message);
    if (err.code === 'same_station') throw ApiError.badRequest(err.message);
    throw err;
  }

  if (!itinerary) {
    throw ApiError.unprocessable(
      `Tidak ada rute yang menghubungkan ${from} dengan ${to} dalam jaringan ini.`
    );
  }

  const fare = calculateItineraryFare(
    itinerary.legs.map((leg) => ({ lineCode: leg.lineCode, distanceKm: leg.distanceKm })),
    fareRules
  );

  return res.json({
    data: {
      from,
      to,
      distance_km: itinerary.totalDistanceKm,
      total_idr: fare.totalIdr,
      components: fare.components.map((c) => ({
        rule: c.ruleName,
        lines: c.lineCodes,
        distance_km: c.distanceKm,
        amount_idr: c.amountIdr,
        breakdown: c.breakdown,
      })),
    },
    meta: { transfers: itinerary.transfers, total_minutes: itinerary.totalMinutes },
  });
};
