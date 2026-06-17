"use server";

import { createClient } from "@/lib/supabase/server";
import { mapPlaceRow, type PlaceRow } from "@/lib/mappers";
import type { MapBounds, Place, PlaceCategory, PlaceFilters } from "@/types/database";

/** Filtered catalog read. All filters are optional and AND-combined. */
export async function getPlaces(filters: PlaceFilters = {}): Promise<Place[]> {
  const supabase = createClient();
  let query = supabase.from("places_with_coords").select("*");

  if (filters.category) query = query.eq("category", filters.category);
  if (filters.city) query = query.eq("city", filters.city);
  if (typeof filters.minRating === "number")
    query = query.gte("rating", filters.minRating);
  if (typeof filters.maxPrice === "number")
    query = query.lte("price_level", filters.maxPrice);
  if (filters.historicOnly) query = query.eq("is_historic", true);
  if (filters.search) query = query.ilike("name", `%${filters.search}%`);
  if (filters.q) {
    // Broad destination match: place name OR city. Strip PostgREST-special
    // chars so the or() filter can't be broken by user input.
    const term = filters.q.replace(/[,()*]/g, " ").trim();
    if (term) query = query.or(`name.ilike.%${term}%,city.ilike.%${term}%`);
  }

  const sort = filters.sort ?? "rating";
  if (sort === "reviews") {
    query = query.order("review_count", { ascending: false });
  } else if (sort === "name") {
    query = query.order("name", { ascending: true });
  } else {
    query = query.order("rating", { ascending: false, nullsFirst: false });
  }

  query = query.limit(filters.limit ?? 60);

  const { data, error } = await query;
  if (error) throw new Error(`getPlaces: ${error.message}`);
  return (data ?? []).map(mapPlaceRow);
}

/** Convenience wrapper: places of a single category, best-rated first. */
export async function getPlacesByCategory(
  category: PlaceCategory,
  limit = 60
): Promise<Place[]> {
  return getPlaces({ category, limit });
}

/** Single place by id, or null when not found. */
export async function getPlaceById(id: string): Promise<Place | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("places_with_coords")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getPlaceById: ${error.message}`);
  return data ? mapPlaceRow(data as PlaceRow) : null;
}

/** Most-saved places (the trending feed), ties broken by rating. */
export async function getTrendingPlaces(
  { limit = 8 }: { limit?: number } = {}
): Promise<Place[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("places_with_coords")
    .select("*")
    .order("save_count", { ascending: false })
    .order("rating", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error(`getTrendingPlaces: ${error.message}`);
  return (data ?? []).map(mapPlaceRow);
}

/** Number of places per category (only categories with ≥1 place appear). */
export async function getCategoryCounts(): Promise<
  Partial<Record<PlaceCategory, number>>
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("places_with_coords")
    .select("category");
  if (error) throw new Error(`getCategoryCounts: ${error.message}`);

  const counts: Partial<Record<PlaceCategory, number>> = {};
  for (const row of (data ?? []) as { category: PlaceCategory }[]) {
    counts[row.category] = (counts[row.category] ?? 0) + 1;
  }
  return counts;
}

/** Headline catalog stats for the home page (total places + distinct geos). */
export async function getCatalogStats(): Promise<{
  places: number;
  cities: number;
  countries: number;
}> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("places_with_coords")
    .select("city, country");
  if (error) throw new Error(`getCatalogStats: ${error.message}`);

  const rows = (data ?? []) as { city: string | null; country: string | null }[];
  const cities = new Set<string>();
  const countries = new Set<string>();
  for (const r of rows) {
    if (r.city) cities.add(r.city);
    if (r.country) countries.add(r.country);
  }
  return { places: rows.length, cities: cities.size, countries: countries.size };
}

/** Places whose point falls inside the given map viewport (PostGIS ST_Within). */
export async function getPlacesInBounds(bounds: MapBounds): Promise<Place[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("places_in_bounds", {
    min_lng: bounds.minLng,
    min_lat: bounds.minLat,
    max_lng: bounds.maxLng,
    max_lat: bounds.maxLat,
  });
  if (error) throw new Error(`getPlacesInBounds: ${error.message}`);
  return ((data ?? []) as PlaceRow[]).map(mapPlaceRow);
}

/** Places within `km` kilometres of a point, nearest first (PostGIS ST_DWithin). */
export async function getPlacesNearby(
  lat: number,
  lng: number,
  km: number,
  limit = 60
): Promise<Place[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("places_nearby", {
    p_lat: lat,
    p_lng: lng,
    p_km: km,
    p_limit: limit,
  });
  if (error) throw new Error(`getPlacesNearby: ${error.message}`);
  return ((data ?? []) as PlaceRow[]).map(mapPlaceRow);
}
