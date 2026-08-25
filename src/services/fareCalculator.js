'use strict';

/**
 * Perhitungan tarif. Fungsi di berkas ini murni: tidak menyentuh basis data,
 * tidak membaca waktu, dan selalu memberi hasil sama untuk masukan sama.
 *
 * Semua jarak diubah lebih dulu menjadi bilangan bulat satuan 10 meter supaya
 * pembandingan di batas tarif tidak terpengaruh galat bilangan pecahan biner.
 * Tanpa ini, 35 km bisa terbaca 35,000000000000004 km dan menyeberang batas
 * yang sebenarnya tidak diseberangi.
 */

const rupiah = (n) => 'Rp' + n.toLocaleString('id-ID');
const toDecameters = (km) => Math.round(km * 100);

/**
 * @param {number} distanceKm  jarak tempuh
 * @param {{name:string, baseFareIdr:number, baseDistanceKm:number,
 *          incrementFareIdr:number, incrementDistanceKm:number}} rule
 */
function calculateFare(distanceKm, rule) {
  if (typeof distanceKm !== 'number' || Number.isNaN(distanceKm) || distanceKm < 0) {
    throw new Error('Jarak tempuh harus berupa angka tidak negatif.');
  }

  const distance = toDecameters(distanceKm);
  const base = toDecameters(rule.baseDistanceKm);
  const step = toDecameters(rule.incrementDistanceKm);

  if (distance <= base || rule.incrementFareIdr === 0) {
    return {
      amountIdr: rule.baseFareIdr,
      steps: 0,
      breakdown: `${rupiah(rule.baseFareIdr)} untuk ${rule.baseDistanceKm} km pertama`,
    };
  }

  const steps = Math.ceil((distance - base) / step);
  const extra = steps * rule.incrementFareIdr;

  return {
    amountIdr: rule.baseFareIdr + extra,
    steps,
    breakdown:
      `${rupiah(rule.baseFareIdr)} untuk ${rule.baseDistanceKm} km pertama` +
      ` + ${rupiah(extra)} untuk sisa ${(distanceKm - rule.baseDistanceKm).toFixed(2)} km` +
      ` (${steps} x ${rule.incrementDistanceKm} km)`,
  };
}

/**
 * Tarif satu perjalanan yang bisa terdiri dari beberapa leg.
 *
 * Lin yang punya aturan tarifnya sendiri (mis. KA Bandara) ditagih terpisah,
 * karena penumpang memang membeli tiket sendiri untuk lin itu. Semua leg lain
 * berada dalam satu jaringan dengan satu kali tap masuk dan tap keluar, jadi
 * jaraknya dijumlahkan lebih dulu baru dikenai tarif satu kali.
 *
 * @param {Array<{lineCode:string, distanceKm:number}>} legs
 * @param {{networkRule:object, rulesByLineCode:Record<string,object>}} rules
 */
function calculateItineraryFare(legs, rules) {
  const components = [];

  const networkLegs = legs.filter((leg) => !rules.rulesByLineCode[leg.lineCode]);
  const specialLegs = legs.filter((leg) => rules.rulesByLineCode[leg.lineCode]);

  if (networkLegs.length > 0) {
    const distanceKm = networkLegs.reduce((sum, leg) => sum + leg.distanceKm, 0);
    const fare = calculateFare(distanceKm, rules.networkRule);
    components.push({
      ruleName: rules.networkRule.name,
      lineCodes: networkLegs.map((leg) => leg.lineCode),
      distanceKm: Number(distanceKm.toFixed(2)),
      amountIdr: fare.amountIdr,
      breakdown: fare.breakdown,
    });
  }

  for (const leg of specialLegs) {
    const rule = rules.rulesByLineCode[leg.lineCode];
    const fare = calculateFare(leg.distanceKm, rule);
    components.push({
      ruleName: rule.name,
      lineCodes: [leg.lineCode],
      distanceKm: Number(leg.distanceKm.toFixed(2)),
      amountIdr: fare.amountIdr,
      breakdown: fare.breakdown,
    });
  }

  return {
    totalIdr: components.reduce((sum, c) => sum + c.amountIdr, 0),
    components,
  };
}

module.exports = { calculateFare, calculateItineraryFare };
