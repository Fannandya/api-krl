'use strict';

const { ApiError } = require('../errors');
const { listLines, getLineByCode } = require('../models/network');

/** GET /v1/lines */
exports.list = async (req, res) => {
  const lines = await listLines();
  return res.json({ data: lines, meta: { count: lines.length } });
};

/** GET /v1/lines/:code — termasuk seluruh perhentian secara berurutan. */
exports.show = async (req, res) => {
  const line = await getLineByCode(req.params.code);
  if (!line) {
    throw ApiError.notFound(`Lin dengan kode "${req.params.code}" tidak ditemukan.`);
  }
  return res.json({ data: line });
};
