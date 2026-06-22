import type { Place, PlaceCategory } from "@/types/database";

/**
 * Pure client-side place filtering, extracted from ExploreClient so it can be
 * unit-tested. Used to narrow the viewport (bounds) results by the active
 * filters, which the bounds RPC does not apply.
 */
export interface PlaceFilterCriteria {
  category?: PlaceCategory;
  /** Max price_level (1–4). */
  maxPrice?: number;
  /** Minimum rating. */
  minRating?: number;
  historicOnly?: boolean;
  /** Free-text match over name + city. */
  q?: string;
}

export function applyPlaceFilters(
  places: Place[],
  f: PlaceFilterCriteria
): Place[] {
  const q = f.q?.toLowerCase().trim();
  return places.filter((p) => {
    if (f.category && p.category !== f.category) return false;
    if (f.maxPrice != null && (p.price_level ?? 99) > f.maxPrice) return false;
    if (f.minRating != null && (p.rating ?? 0) < f.minRating) return false;
    if (f.historicOnly && !p.is_historic) return false;
    if (q) {
      const hay = `${p.name} ${p.city ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
