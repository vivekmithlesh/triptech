import { describe, expect, it } from "vitest";

import { applyPlaceFilters } from "@/lib/filters";
import type { Place } from "@/types/database";

let id = 0;
function place(over: Partial<Place> = {}): Place {
  return {
    id: `p${id++}`,
    name: "A Place",
    description: null,
    category: "cafe",
    city: "Goa",
    state: null,
    country: "India",
    location: null,
    rating: 4,
    review_count: 10,
    price_level: 2,
    opening_hours: null,
    is_historic: false,
    cover_image: null,
    images: [],
    external_ids: {},
    created_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("applyPlaceFilters", () => {
  const places = [
    place({ name: "Beach Cafe", category: "cafe", price_level: 1, rating: 4.5, city: "Goa" }),
    place({ name: "Fort Aguada", category: "monument", price_level: 3, rating: 4.8, is_historic: true, city: "Goa" }),
    place({ name: "Sky Lounge", category: "restaurant", price_level: 4, rating: 3.9, city: "Mumbai" }),
  ];

  it("returns everything when no criteria are given", () => {
    expect(applyPlaceFilters(places, {})).toHaveLength(3);
  });

  it("filters by category", () => {
    const r = applyPlaceFilters(places, { category: "monument" });
    expect(r.map((p) => p.name)).toEqual(["Fort Aguada"]);
  });

  it("filters by max price level", () => {
    const r = applyPlaceFilters(places, { maxPrice: 2 });
    expect(r.map((p) => p.name)).toEqual(["Beach Cafe"]);
  });

  it("filters by minimum rating", () => {
    const r = applyPlaceFilters(places, { minRating: 4.6 });
    expect(r.map((p) => p.name)).toEqual(["Fort Aguada"]);
  });

  it("filters historic-only", () => {
    const r = applyPlaceFilters(places, { historicOnly: true });
    expect(r.map((p) => p.name)).toEqual(["Fort Aguada"]);
  });

  it("matches the free-text query over name and city", () => {
    expect(applyPlaceFilters(places, { q: "fort" }).map((p) => p.name)).toEqual([
      "Fort Aguada",
    ]);
    expect(applyPlaceFilters(places, { q: "mumbai" }).map((p) => p.name)).toEqual([
      "Sky Lounge",
    ]);
  });

  it("combines multiple criteria (AND)", () => {
    const r = applyPlaceFilters(places, { minRating: 4, maxPrice: 1 });
    expect(r.map((p) => p.name)).toEqual(["Beach Cafe"]);
  });
});
