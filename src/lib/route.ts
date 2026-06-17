// Pure, deterministic route-ordering helpers for the trip optimiser.
// Distances are great-circle (haversine) in kilometres — equivalent to
// @turf/distance for ordering, but allocation-free for the hot matrix loop.
import type { LatLng } from "@/types/database";

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function distanceMatrix(points: LatLng[]): number[][] {
  const n = points.length;
  const m = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = haversineKm(points[i], points[j]);
      m[i][j] = d;
      m[j][i] = d;
    }
  }
  return m;
}

export function routeLength(order: number[], m: number[][]): number {
  let s = 0;
  for (let i = 0; i < order.length - 1; i++) s += m[order[i]][order[i + 1]];
  return s;
}

/** Greedy nearest-neighbour tour starting from `start`. */
export function nearestNeighbour(m: number[][], start = 0): number[] {
  const n = m.length;
  if (n === 0) return [];
  const visited = new Array(n).fill(false);
  const order = [start];
  visited[start] = true;
  for (let k = 1; k < n; k++) {
    const last = order[order.length - 1];
    let best = -1;
    let bestD = Infinity;
    for (let j = 0; j < n; j++) {
      if (!visited[j] && m[last][j] < bestD) {
        bestD = m[last][j];
        best = j;
      }
    }
    if (best === -1) break;
    order.push(best);
    visited[best] = true;
  }
  return order;
}

/** 2-opt local search to remove path crossings. Capped for determinism. */
export function twoOpt(order: number[], m: number[][]): number[] {
  if (order.length < 4) return order.slice();
  let best = order.slice();
  let bestLen = routeLength(best, m);
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 60) {
    improved = false;
    for (let i = 1; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const candidate = best
          .slice(0, i)
          .concat(best.slice(i, k + 1).reverse(), best.slice(k + 1));
        const len = routeLength(candidate, m);
        if (len + 1e-9 < bestLen) {
          best = candidate;
          bestLen = len;
          improved = true;
        }
      }
    }
  }
  return best;
}

/** Splits an ordered index list into `days` buckets, evenly by count. */
export function splitIntoDays(order: number[], days: number): number[][] {
  const d = Math.max(1, days);
  const perDay = Math.max(1, Math.ceil(order.length / d));
  const result: number[][] = [];
  for (let i = 0; i < order.length; i += perDay) {
    result.push(order.slice(i, i + perDay));
  }
  while (result.length < d) result.push([]);
  return result;
}

/** Full optimise: NN + 2-opt, then split into days. Returns ordered indices per day. */
export function optimiseOrder(points: LatLng[], days: number): number[][] {
  if (points.length === 0) return Array.from({ length: Math.max(1, days) }, () => []);
  const m = distanceMatrix(points);
  const order = twoOpt(nearestNeighbour(m, 0), m);
  return splitIntoDays(order, days);
}
