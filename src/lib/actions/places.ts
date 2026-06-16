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
