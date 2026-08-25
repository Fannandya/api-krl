'use strict';

const { query } = require('../config/database');

/**
 * Query untuk data domain KRL. Semua kolom NUMERIC dari Postgres tiba sebagai
 * string di driver pg, jadi dikonversi ke number di sini supaya lapisan service
 * hanya pernah menerima angka.
 */

const num = (v) => (v === null || v === undefined ? null : Number(v));

async function listStations({ search, lineCode, city, limit = 25, offset = 0 }) {
  const { rows } = await query(
    `SELECT s.id, s.code, s.name, s.city, s.latitude, s.longitude,
            s.is_interchange, s.interchange_minutes,
            COALESCE(
              ARRAY_AGG(l.code ORDER BY l.code) FILTER (WHERE l.code IS NOT NULL),
              '{}'
            ) AS line_codes,
            COUNT(*) OVER () AS total_count
     FROM stations s
     LEFT JOIN line_stations ls ON ls.station_id = s.id
     LEFT JOIN lines l          ON l.id = ls.line_id
     WHERE ($1::text IS NULL OR s.name ILIKE '%' || $1 || '%' OR s.code ILIKE '%' || $1 || '%')
       AND ($3::text IS NULL OR s.city ILIKE '%' || $3 || '%')
       AND ($2::text IS NULL OR EXISTS (
             SELECT 1 FROM line_stations ls2
             JOIN lines l2 ON l2.id = ls2.line_id
             WHERE ls2.station_id = s.id AND l2.code = UPPER($2)))
     GROUP BY s.id
     ORDER BY s.name
     LIMIT $4 OFFSET $5`,
    [search || null, lineCode || null, city || null, limit, offset]
  );

  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
  return {
    total,
    stations: rows.map((r) => ({
      code: r.code,
      name: r.name,
      city: r.city,
      latitude: num(r.latitude),
      longitude: num(r.longitude),
      is_interchange: r.is_interchange,
      interchange_minutes: r.interchange_minutes,
      lines: r.line_codes,
    })),
  };
}

/**
 * Stasiun terdekat dari sebuah titik. Jarak dihitung dengan rumus haversine
 * langsung di SQL supaya pengurutan dan pembatasan radius terjadi di basis data,
 * bukan setelah semua baris ditarik ke aplikasi.
 */
async function listStationsNear({ latitude, longitude, radiusKm = 5, limit = 10 }) {
  const { rows } = await query(
    `WITH jarak AS (
       SELECT s.*,
              6371 * 2 * asin(sqrt(
                power(sin(radians(s.latitude - $1) / 2), 2)
                + cos(radians($1)) * cos(radians(s.latitude))
                * power(sin(radians(s.longitude - $2) / 2), 2)
              )) AS distance_km
       FROM stations s
     )
     SELECT j.code, j.name, j.city, j.latitude, j.longitude, j.is_interchange,
            ROUND(j.distance_km::numeric, 2) AS distance_km,
            COALESCE(ARRAY_AGG(l.code ORDER BY l.code) FILTER (WHERE l.code IS NOT NULL), '{}') AS line_codes
     FROM jarak j
     LEFT JOIN line_stations ls ON ls.station_id = j.id
     LEFT JOIN lines l          ON l.id = ls.line_id
     WHERE j.distance_km <= $3
     GROUP BY j.code, j.name, j.city, j.latitude, j.longitude, j.is_interchange, j.distance_km
     ORDER BY j.distance_km
     LIMIT $4`,
    [latitude, longitude, radiusKm, limit]
  );

  return rows.map((r) => ({
    code: r.code,
    name: r.name,
    city: r.city,
    latitude: num(r.latitude),
    longitude: num(r.longitude),
    is_interchange: r.is_interchange,
    distance_km: num(r.distance_km),
    lines: r.line_codes,
  }));
}

/** Detail satu stasiun beserta lin yang melayaninya dan stasiun tetangganya. */
async function getStationByCode(code) {
  const { rows } = await query(
    `SELECT id, code, name, city, latitude, longitude, is_interchange, interchange_minutes
     FROM stations WHERE UPPER(code) = UPPER($1)`,
    [code]
  );
  if (rows.length === 0) return null;
  const station = rows[0];

  const { rows: served } = await query(
    `SELECT l.code, l.name, l.color_hex, ls.stop_order, ls.distance_km_from_origin,
            prev.code AS prev_code, prev.name AS prev_name,
            next.code AS next_code, next.name AS next_name
     FROM line_stations ls
     JOIN lines l ON l.id = ls.line_id
     LEFT JOIN LATERAL (
       SELECT s2.code, s2.name FROM line_stations ls2
       JOIN stations s2 ON s2.id = ls2.station_id
       WHERE ls2.line_id = ls.line_id AND ls2.stop_order = ls.stop_order - 1
     ) prev ON TRUE
     LEFT JOIN LATERAL (
       SELECT s3.code, s3.name FROM line_stations ls3
       JOIN stations s3 ON s3.id = ls3.station_id
       WHERE ls3.line_id = ls.line_id AND ls3.stop_order = ls.stop_order + 1
     ) next ON TRUE
     WHERE ls.station_id = $1
     ORDER BY l.code`,
    [station.id]
  );

  return {
    code: station.code,
    name: station.name,
    city: station.city,
    latitude: num(station.latitude),
    longitude: num(station.longitude),
    is_interchange: station.is_interchange,
    interchange_minutes: station.interchange_minutes,
    served_by: served.map((r) => ({
      line_code: r.code,
      line_name: r.name,
      color_hex: r.color_hex,
      stop_order: r.stop_order,
      distance_km_from_origin: num(r.distance_km_from_origin),
      previous_station: r.prev_code ? { code: r.prev_code, name: r.prev_name } : null,
      next_station: r.next_code ? { code: r.next_code, name: r.next_name } : null,
    })),
  };
}

async function listLines() {
  const { rows } = await query(
    `SELECT l.code, l.name, l.color_hex, l.operator, l.description,
            COUNT(ls.id)::int                       AS station_count,
            MAX(ls.distance_km_from_origin)         AS length_km,
            SUM(ls.travel_minutes_from_prev)::int   AS travel_minutes
     FROM lines l
     LEFT JOIN line_stations ls ON ls.line_id = l.id
     GROUP BY l.id
     ORDER BY l.code`
  );
  return rows.map((r) => ({
    code: r.code,
    name: r.name,
    color_hex: r.color_hex,
    operator: r.operator,
    description: r.description,
    station_count: r.station_count,
    length_km: num(r.length_km),
    travel_minutes: r.travel_minutes,
  }));
}

async function getLineByCode(code) {
  const { rows } = await query(
    `SELECT id, code, name, color_hex, operator, description
     FROM lines WHERE UPPER(code) = UPPER($1)`,
    [code]
  );
  if (rows.length === 0) return null;
  const line = rows[0];

  const { rows: stops } = await query(
    `SELECT s.code, s.name, s.city, s.is_interchange,
            ls.stop_order, ls.distance_km_from_origin, ls.travel_minutes_from_prev
     FROM line_stations ls
     JOIN stations s ON s.id = ls.station_id
     WHERE ls.line_id = $1
     ORDER BY ls.stop_order`,
    [line.id]
  );

  return {
    code: line.code,
    name: line.name,
    color_hex: line.color_hex,
    operator: line.operator,
    description: line.description,
    station_count: stops.length,
    length_km: stops.length ? num(stops[stops.length - 1].distance_km_from_origin) : 0,
    travel_minutes: stops.reduce((sum, s) => sum + s.travel_minutes_from_prev, 0),
    stations: stops.map((s) => ({
      code: s.code,
      name: s.name,
      city: s.city,
      is_interchange: s.is_interchange,
      stop_order: s.stop_order,
      distance_km_from_origin: num(s.distance_km_from_origin),
      travel_minutes_from_prev: s.travel_minutes_from_prev,
    })),
  };
}

/** Pola operasi untuk sebuah stasiun, sudah disaring menurut jenis hari. */
async function getServicePatternsForStation({ stationCode, dayType, lineCode }) {
  const { rows } = await query(
    `SELECT sp.direction, sp.day_type, sp.start_time, sp.end_time, sp.headway_minutes,
            l.code AS line_code, l.name AS line_name
     FROM service_patterns sp
     JOIN lines l         ON l.id = sp.line_id
     JOIN line_stations ls ON ls.line_id = l.id
     JOIN stations s      ON s.id = ls.station_id
     WHERE UPPER(s.code) = UPPER($1)
       AND sp.day_type = $2
       AND ($3::text IS NULL OR l.code = UPPER($3))
     ORDER BY l.code, sp.direction, sp.start_time`,
    [stationCode, dayType, lineCode || null]
  );

  return rows.map((r) => ({
    lineCode: r.line_code,
    lineName: r.line_name,
    direction: r.direction,
    dayType: r.day_type,
    startTime: r.start_time,
    endTime: r.end_time,
    headwayMinutes: r.headway_minutes,
  }));
}

/** Seluruh perhentian di jaringan — bahan baku untuk membangun graf rute. */
async function getAllLineStations() {
  const { rows } = await query(
    `SELECT l.code AS line_code, l.name AS line_name,
            s.code AS station_code, s.name AS station_name,
            ls.stop_order, ls.distance_km_from_origin, ls.travel_minutes_from_prev,
            s.interchange_minutes
     FROM line_stations ls
     JOIN lines l    ON l.id = ls.line_id
     JOIN stations s ON s.id = ls.station_id
     ORDER BY l.code, ls.stop_order`
  );

  return rows.map((r) => ({
    lineCode: r.line_code,
    lineName: r.line_name,
    stationCode: r.station_code,
    stationName: r.station_name,
    stopOrder: r.stop_order,
    distanceKm: num(r.distance_km_from_origin),
    travelMinutesFromPrev: r.travel_minutes_from_prev,
    interchangeMinutes: r.interchange_minutes,
  }));
}

/** Aturan tarif yang berlaku pada tanggal tertentu, dipisah jaringan vs per lin. */
async function getActiveFareRules(onDate = new Date()) {
  const { rows } = await query(
    `SELECT fr.name, fr.base_fare_idr, fr.base_distance_km,
            fr.increment_fare_idr, fr.increment_distance_km, l.code AS line_code
     FROM fare_rules fr
     LEFT JOIN lines l ON l.id = fr.line_id
     WHERE fr.effective_from <= $1
       AND (fr.effective_to IS NULL OR fr.effective_to > $1)`,
    [onDate]
  );

  const toRule = (r) => ({
    name: r.name,
    baseFareIdr: r.base_fare_idr,
    baseDistanceKm: num(r.base_distance_km),
    incrementFareIdr: r.increment_fare_idr,
    incrementDistanceKm: num(r.increment_distance_km),
  });

  const networkRow = rows.find((r) => r.line_code === null);
  const rulesByLineCode = {};
  for (const r of rows) {
    if (r.line_code !== null) rulesByLineCode[r.line_code] = toRule(r);
  }

  return {
    networkRule: networkRow ? toRule(networkRow) : null,
    rulesByLineCode,
  };
}

async function getNetworkStats() {
  const { rows } = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM stations)                            AS station_count,
       (SELECT COUNT(*)::int FROM lines)                               AS line_count,
       (SELECT COUNT(*)::int FROM stations WHERE is_interchange)        AS interchange_count,
       (SELECT COUNT(*)::int FROM line_stations)                        AS stop_count,
       (SELECT COUNT(DISTINCT city)::int FROM stations)                 AS city_count,
       (SELECT SUM(m)::numeric FROM (
          SELECT MAX(distance_km_from_origin) AS m FROM line_stations GROUP BY line_id
        ) x)                                                           AS total_length_km`
  );
  const r = rows[0];
  return {
    station_count: r.station_count,
    line_count: r.line_count,
    interchange_count: r.interchange_count,
    stop_count: r.stop_count,
    city_count: r.city_count,
    total_length_km: num(r.total_length_km),
  };
}

module.exports = {
  listStations,
  listStationsNear,
  getStationByCode,
  listLines,
  getLineByCode,
  getServicePatternsForStation,
  getAllLineStations,
  getActiveFareRules,
  getNetworkStats,
};
