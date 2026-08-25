'use strict';

const { getNetworkStats } = require('../models/network');

/** GET /v1/stats — ringkasan jaringan, berguna sebagai panggilan uji coba. */
exports.show = async (req, res) => {
  const stats = await getNetworkStats();
  return res.json({
    data: stats,
    meta: { source: 'Data referensi akademik, bukan data operasional KAI Commuter.' },
  });
};
