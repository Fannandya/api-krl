'use strict';

const { ApiError } = require('../errors');

/** Bilangan bulat dari query string, dengan batas dan nilai bawaan. */
function intParam(value, { name, min, max, fallback }) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw ApiError.badRequest(`Parameter "${name}" harus berupa bilangan bulat.`);
  }
  if (parsed < min || parsed > max) {
    throw ApiError.badRequest(`Parameter "${name}" harus antara ${min} dan ${max}.`);
  }
  return parsed;
}

function floatParam(value, { name, min, max }) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw ApiError.badRequest(`Parameter "${name}" harus berupa angka.`);
  }
  if (parsed < min || parsed > max) {
    throw ApiError.badRequest(`Parameter "${name}" harus antara ${min} dan ${max}.`);
  }
  return parsed;
}

function enumParam(value, { name, allowed, fallback }) {
  if (value === undefined || value === '') return fallback;
  const normalized = String(value).toLowerCase();
  if (!allowed.includes(normalized)) {
    throw ApiError.badRequest(
      `Parameter "${name}" harus salah satu dari: ${allowed.join(', ')}.`
    );
  }
  return normalized;
}

function requiredParam(value, name) {
  if (value === undefined || value === null || String(value).trim() === '') {
    throw ApiError.badRequest(`Parameter "${name}" wajib diisi.`);
  }
  return String(value).trim();
}

/** Paginasi seragam untuk semua daftar. */
function pagination(query) {
  const limit = intParam(query.limit, { name: 'limit', min: 1, max: 100, fallback: 25 });
  const page = intParam(query.page, { name: 'page', min: 1, max: 10000, fallback: 1 });
  return { limit, page, offset: (page - 1) * limit };
}

function paginationMeta({ total, page, limit }) {
  return {
    total,
    page,
    limit,
    total_pages: Math.max(1, Math.ceil(total / limit)),
    has_next: page * limit < total,
  };
}

module.exports = { intParam, floatParam, enumParam, requiredParam, pagination, paginationMeta };
