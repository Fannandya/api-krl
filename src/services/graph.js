'use strict';

/**
 * Membangun graf jaringan dari isi tabel line_stations. Fungsi murni.
 *
 * Satu simpul bukan sekadar "stasiun", melainkan pasangan (stasiun, lin).
 * Pemisahan ini penting: tanpanya, algoritma pencarian rute akan menganggap
 * berpindah kereta di sebuah stasiun tidak memakan waktu sama sekali, dan
 * hasilnya berupa rute yang terlihat cepat di atas kertas tetapi mustahil
 * ditempuh di dunia nyata.
 *
 * Ada dua jenis sisi:
 *   ride     - antar perhentian berurutan pada lin yang sama, berbiaya waktu
 *              tempuh, dan menambah jarak.
 *   transfer - antar lin di stasiun yang sama, berbiaya waktu pindah peron,
 *              tanpa menambah jarak.
 */

const nodeId = (stationCode, lineCode) => `${stationCode}@${lineCode}`;

function buildGraph(rows) {
  const adjacency = new Map();
  const nodes = new Map();
  const stationLines = new Map();
  const stationNames = new Map();

  const addNode = (row) => {
    const id = nodeId(row.stationCode, row.lineCode);
    if (!nodes.has(id)) {
      nodes.set(id, {
        id,
        stationCode: row.stationCode,
        stationName: row.stationName,
        lineCode: row.lineCode,
        lineName: row.lineName,
        distanceKm: Number(row.distanceKm),
        stopOrder: Number(row.stopOrder),
      });
      adjacency.set(id, []);
    }
    if (!stationLines.has(row.stationCode)) stationLines.set(row.stationCode, new Set());
    stationLines.get(row.stationCode).add(row.lineCode);
    stationNames.set(row.stationCode, row.stationName);
    return nodes.get(id);
  };

  const addEdge = (fromId, toId, kind, minutes, distanceKm) => {
    adjacency.get(fromId).push({ to: toId, kind, minutes, distanceKm });
  };

  // Sisi ride: susun tiap lin menurut urutan perhentian, lalu hubungkan
  // perhentian yang bersebelahan pada kedua arah.
  const byLine = new Map();
  for (const row of rows) {
    addNode(row);
    if (!byLine.has(row.lineCode)) byLine.set(row.lineCode, []);
    byLine.get(row.lineCode).push(row);
  }

  for (const stops of byLine.values()) {
    stops.sort((a, b) => Number(a.stopOrder) - Number(b.stopOrder));
    for (let i = 1; i < stops.length; i += 1) {
      const prev = stops[i - 1];
      const curr = stops[i];
      const minutes = Number(curr.travelMinutesFromPrev);
      const distanceKm = Math.abs(Number(curr.distanceKm) - Number(prev.distanceKm));
      const a = nodeId(prev.stationCode, prev.lineCode);
      const b = nodeId(curr.stationCode, curr.lineCode);
      addEdge(a, b, 'ride', minutes, distanceKm);
      addEdge(b, a, 'ride', minutes, distanceKm);
    }
  }

  // Sisi transfer: setiap pasangan lin yang bertemu di stasiun yang sama.
  const interchangeMinutes = new Map();
  for (const row of rows) interchangeMinutes.set(row.stationCode, Number(row.interchangeMinutes));

  for (const [stationCode, lineSet] of stationLines) {
    const lineCodes = [...lineSet];
    if (lineCodes.length < 2) continue;
    const minutes = interchangeMinutes.get(stationCode);
    for (const from of lineCodes) {
      for (const to of lineCodes) {
        if (from === to) continue;
        addEdge(nodeId(stationCode, from), nodeId(stationCode, to), 'transfer', minutes, 0);
      }
    }
  }

  return {
    nodes,
    adjacency,
    stationNames,
    hasStation: (code) => stationLines.has(code),
    linesAtStation: (code) => [...(stationLines.get(code) || [])],
    nodesAtStation: (code) =>
      [...(stationLines.get(code) || [])].map((lineCode) => nodeId(code, lineCode)),
  };
}

module.exports = { buildGraph, nodeId };
