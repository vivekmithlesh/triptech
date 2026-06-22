import { describe, expect, it } from "vitest";

import {
  distanceMatrix,
  haversineKm,
  nearestNeighbour,
  optimiseOrder,
  routeLength,
  splitIntoDays,
  twoOpt,
} from "@/lib/route";

const SQUARE = [
  { lat: 0, lng: 0 },
  { lat: 0, lng: 1 },
  { lat: 1, lng: 1 },
  { lat: 1, lng: 0 },
];

describe("haversineKm", () => {
  it("is zero for identical points", () => {
    expect(haversineKm({ lat: 12.97, lng: 77.59 }, { lat: 12.97, lng: 77.59 })).toBe(0);
  });

  it("is ~111km for one degree of latitude", () => {
    const d = haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(112);
  });

  it("is symmetric", () => {
    const a = { lat: 28.6, lng: 77.2 };
    const b = { lat: 19.07, lng: 72.87 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6);
  });
});

describe("distanceMatrix", () => {
  it("is square, symmetric, with a zero diagonal", () => {
    const m = distanceMatrix(SQUARE);
    expect(m).toHaveLength(4);
    for (let i = 0; i < 4; i++) {
      expect(m[i]).toHaveLength(4);
      expect(m[i][i]).toBe(0);
      for (let j = 0; j < 4; j++) expect(m[i][j]).toBeCloseTo(m[j][i], 9);
    }
  });
});

describe("nearestNeighbour", () => {
  it("visits the unit square corners in adjacency order from start 0", () => {
    const order = nearestNeighbour(distanceMatrix(SQUARE), 0);
    expect(order).toEqual([0, 1, 2, 3]);
  });

  it("returns [] for no points", () => {
    expect(nearestNeighbour([])).toEqual([]);
  });
});

describe("twoOpt", () => {
  it("never lengthens the route", () => {
    const m = distanceMatrix(SQUARE);
    // A deliberately crossed tour (0 -> 2 -> 1 -> 3) has crossings to remove.
    const crossed = [0, 2, 1, 3];
    const improved = twoOpt(crossed, m);
    expect(routeLength(improved, m)).toBeLessThanOrEqual(routeLength(crossed, m));
  });

  it("is a no-op for fewer than 4 points", () => {
    const m = distanceMatrix(SQUARE.slice(0, 3));
    expect(twoOpt([0, 1, 2], m)).toEqual([0, 1, 2]);
  });
});

describe("splitIntoDays", () => {
  it("covers every index exactly once across the buckets", () => {
    const buckets = splitIntoDays([0, 1, 2, 3, 4], 2);
    expect(buckets.flat().sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it("always returns exactly `days` buckets (padding with empties)", () => {
    expect(splitIntoDays([0], 3)).toHaveLength(3);
    expect(splitIntoDays([0, 1, 2], 1)).toHaveLength(1);
  });
});

describe("optimiseOrder", () => {
  it("returns `days` buckets whose union is a permutation of all indices", () => {
    const points = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 2 },
      { lat: 2, lng: 2 },
      { lat: 2, lng: 0 },
      { lat: 1, lng: 1 },
    ];
    const days = 2;
    const plan = optimiseOrder(points, days);
    expect(plan).toHaveLength(days);
    const flat = plan.flat();
    expect(flat).toHaveLength(points.length);
    expect([...flat].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
  });

  it("handles zero points without throwing", () => {
    expect(optimiseOrder([], 3)).toHaveLength(3);
  });
});
