'use strict';

/**
 * Pencarian rute terbaik dengan algoritma Dijkstra. Fungsi murni.
 *
 * Biaya yang diminimalkan adalah waktu tempuh dalam menit, bukan jarak, karena
 * itulah yang dirasakan penumpang. Akibatnya rute yang memutar lebih jauh bisa
 * saja terpilih bila lin yang dilaluinya lebih cepat.
 */

/** Antrean prioritas biner sederhana; cukup untuk jaringan sebesar ini. */
class MinHeap {
  constructor() {
    this.items = [];
  }

  get size() {
    return this.items.length;
  }

  push(priority, value) {
    this.items.push({ priority, value });
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].priority <= this.items[i].priority) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }

  pop() {
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let smallest = i;
        if (left < this.items.length && this.items[left].priority < this.items[smallest].priority) smallest = left;
        if (right < this.items.length && this.items[right].priority < this.items[smallest].priority) smallest = right;
        if (smallest === i) break;
        [this.items[smallest], this.items[i]] = [this.items[i], this.items[smallest]];
        i = smallest;
      }
    }
    return top;
  }
}

function routeError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/**
 * @returns {object|null} rincian perjalanan, atau null bila kedua stasiun
 *                        tidak terhubung sama sekali dalam jaringan.
 */
function findRoute(graph, fromCode, toCode) {
  if (!graph.hasStation(fromCode)) {
    throw routeError('unknown_station', `Stasiun asal "${fromCode}" tidak ada dalam jaringan.`);
  }
  if (!graph.hasStation(toCode)) {
    throw routeError('unknown_station', `Stasiun tujuan "${toCode}" tidak ada dalam jaringan.`);
  }
  if (fromCode === toCode) {
    throw routeError('same_station', 'Stasiun asal dan tujuan tidak boleh sama.');
  }

  const dist = new Map();
  const prev = new Map();
  const heap = new MinHeap();

  // Penumpang boleh memulai dari peron lin mana pun di stasiun asal,
  // jadi semua simpul di stasiun itu berbiaya awal nol.
  for (const id of graph.nodesAtStation(fromCode)) {
    dist.set(id, 0);
    heap.push(0, id);
  }

  const targets = new Set(graph.nodesAtStation(toCode));
  let best = null;

  while (heap.size > 0) {
    const { priority, value: current } = heap.pop();
    if (priority > (dist.get(current) ?? Infinity)) continue;
    if (targets.has(current)) {
      best = current;
      break;
    }
    for (const edge of graph.adjacency.get(current) || []) {
      const candidate = priority + edge.minutes;
      if (candidate < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, candidate);
        prev.set(edge.to, { from: current, edge });
        heap.push(candidate, edge.to);
      }
    }
  }

  if (best === null) return null;

  return buildItinerary(graph, prev, best, dist.get(best));
}

/** Menyusun urutan simpul hasil Dijkstra menjadi leg per lin. */
function buildItinerary(graph, prev, endNodeId, totalMinutes) {
  const steps = [];
  let cursor = endNodeId;
  while (prev.has(cursor)) {
    const { from, edge } = prev.get(cursor);
    steps.push({ from, to: cursor, edge });
    cursor = from;
  }
  steps.reverse();

  const legs = [];
  let transferMinutes = 0;
  let current = null;

  const startLeg = (nodeIdValue) => {
    const node = graph.nodes.get(nodeIdValue);
    return {
      lineCode: node.lineCode,
      lineName: node.lineName,
      fromCode: node.stationCode,
      fromName: node.stationName,
      toCode: node.stationCode,
      toName: node.stationName,
      stationCodes: [node.stationCode],
      stationNames: [node.stationName],
      minutes: 0,
      distanceKm: 0,
    };
  };

  if (steps.length > 0) current = startLeg(steps[0].from);

  for (const step of steps) {
    if (step.edge.kind === 'transfer') {
      transferMinutes += step.edge.minutes;
      if (current && current.stationCodes.length > 1) legs.push(current);
      current = startLeg(step.to);
      continue;
    }
    const node = graph.nodes.get(step.to);
    current.stationCodes.push(node.stationCode);
    current.stationNames.push(node.stationName);
    current.toCode = node.stationCode;
    current.toName = node.stationName;
    current.minutes += step.edge.minutes;
    current.distanceKm = Number((current.distanceKm + step.edge.distanceKm).toFixed(2));
  }
  if (current && current.stationCodes.length > 1) legs.push(current);

  for (const leg of legs) leg.stops = leg.stationCodes.length - 1;

  return {
    fromCode: legs.length ? legs[0].fromCode : null,
    toCode: legs.length ? legs[legs.length - 1].toCode : null,
    totalMinutes,
    totalDistanceKm: Number(legs.reduce((sum, l) => sum + l.distanceKm, 0).toFixed(2)),
    transfers: Math.max(0, legs.length - 1),
    transferMinutes,
    legs,
  };
}

module.exports = { findRoute };
