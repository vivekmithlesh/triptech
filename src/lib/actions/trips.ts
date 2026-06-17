"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mapPlaceRow, type PlaceRow } from "@/lib/mappers";
import { optimiseOrder } from "@/lib/route";
import type { Trip, TripItem, TripWithItems } from "@/types/database";

interface TripItemRow {
  id: string;
  trip_id: string;
  place_id: string;
  day_number: number;
  order_index: number;
  arrival_time: string | null;
  notes: string | null;
  created_at: string;
}

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "trip"}-${suffix}`;
}

/** Loads a trip's ordered items with each item's place populated. */
async function loadTripItems(
  supabase: ReturnType<typeof createClient>,
  tripId: string
): Promise<TripItem[]> {
  const { data: itemRows, error } = await supabase
    .from("trip_items")
    .select("*")
    .eq("trip_id", tripId)
    .order("day_number", { ascending: true })
    .order("order_index", { ascending: true });
  if (error) throw new Error(`getTripItems: ${error.message}`);

  const items = (itemRows ?? []) as TripItemRow[];
  if (items.length === 0) return [];

  const placeIds = Array.from(new Set(items.map((i) => i.place_id)));
  const { data: placeRows, error: placeErr } = await supabase
    .from("places_with_coords")
    .select("*")
    .in("id", placeIds);
  if (placeErr) throw new Error(`getTripItems.places: ${placeErr.message}`);

  const placeById = new Map(
    ((placeRows ?? []) as PlaceRow[]).map((r) => [r.id, mapPlaceRow(r)])
  );

  return items.map((i) => ({ ...i, place: placeById.get(i.place_id) }));
}

/** All trips owned by the current user, newest first. */
export async function getMyTrips(): Promise<Trip[]> {
  const user = await requireUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getMyTrips: ${error.message}`);
  return (data ?? []) as Trip[];
}

/** A single trip with its ordered items. RLS allows owner or public trips. */
export async function getTripById(id: string): Promise<TripWithItems | null> {
  const supabase = createClient();
  const { data: trip, error } = await supabase
    .from("trips")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getTripById: ${error.message}`);
  if (!trip) return null;
  const items = await loadTripItems(supabase, id);
  return { ...(trip as Trip), items };
}

/** Public, no-login lookup of a shared trip by its slug. */
export async function getPublicTripBySlug(
  slug: string
): Promise<TripWithItems | null> {
  const supabase = createClient();
  const { data: trip, error } = await supabase
    .from("trips")
    .select("*")
    .eq("share_slug", slug)
    .eq("is_public", true)
    .maybeSingle();
  if (error) throw new Error(`getPublicTripBySlug: ${error.message}`);
  if (!trip) return null;
  const items = await loadTripItems(supabase, (trip as Trip).id);
  return { ...(trip as Trip), items };
}

export interface CreateTripInput {
  title: string;
  destination?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  days?: number | null;
  coverImage?: string | null;
  isPublic?: boolean;
}

export async function createTrip(input: CreateTripInput): Promise<Trip> {
  const user = await requireUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("trips")
    .insert({
      user_id: user.id,
      title: input.title,
      destination: input.destination ?? null,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      days: input.days ?? null,
      cover_image: input.coverImage ?? null,
      is_public: input.isPublic ?? false,
      share_slug: input.isPublic ? slugify(input.title) : null,
    })
    .select("*")
    .single();
  if (error) throw new Error(`createTrip: ${error.message}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/trips");
  return data as Trip;
}

export interface AddPlaceToTripInput {
  tripId: string;
  placeId: string;
  dayNumber?: number;
  arrivalTime?: string | null;
  notes?: string | null;
}

export async function addPlaceToTrip(
  input: AddPlaceToTripInput
): Promise<TripItem> {
  await requireUser();
  const supabase = createClient();
  const dayNumber = input.dayNumber ?? 1;

  // Append to the end of the target day.
  const { count } = await supabase
    .from("trip_items")
    .select("*", { count: "exact", head: true })
    .eq("trip_id", input.tripId)
    .eq("day_number", dayNumber);

  const { data, error } = await supabase
    .from("trip_items")
    .insert({
      trip_id: input.tripId,
      place_id: input.placeId,
      day_number: dayNumber,
      order_index: count ?? 0,
      arrival_time: input.arrivalTime ?? null,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(`addPlaceToTrip: ${error.message}`);
  revalidatePath(`/trip/${input.tripId}`);
  return data as TripItem;
}

export interface TripItemPosition {
  id: string;
  dayNumber: number;
  orderIndex: number;
}

/** Persists a new day/order arrangement after a drag-reorder. */
export async function reorderTripItems(
  tripId: string,
  positions: TripItemPosition[]
): Promise<void> {
  await requireUser();
  const supabase = createClient();
  await Promise.all(
    positions.map((p) =>
      supabase
        .from("trip_items")
        .update({ day_number: p.dayNumber, order_index: p.orderIndex })
        .eq("id", p.id)
        .eq("trip_id", tripId)
    )
  );
  revalidatePath(`/trip/${tripId}`);
}

/**
 * Orders the trip's places into an efficient route (nearest-neighbour + 2-opt
 * over haversine distances), splits them across the trip's days, and writes
 * back day_number + order_index + a per-day route_geojson. Deterministic.
 */
export async function optimiseTrip(
  tripId: string
): Promise<TripWithItems | null> {
  const user = await requireUser();
  const supabase = createClient();

  const { data: tripRow, error: tripErr } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .maybeSingle();
  if (tripErr) throw new Error(`optimiseTrip.trip: ${tripErr.message}`);
  const trip = tripRow as Trip | null;
  if (!trip) return null;
  if (trip.user_id !== user.id) throw new Error("Not your trip.");

  const items = await loadTripItems(supabase, tripId);
  if (items.length === 0) return { ...trip, items };

  const located = items.filter((i) => i.place?.location);
  const unlocated = items.filter((i) => !i.place?.location);
  const points = located.map((i) => i.place!.location!);

  const all = [...located, ...unlocated];
  const dayBuckets = optimiseOrder(points, trip.days ?? 1);
  // Park any place we can't geo-locate at the end of the last day. Their
  // indices into `all` start right after the located items.
  if (unlocated.length > 0) {
    const last = dayBuckets.length - 1;
    dayBuckets[last] = [
      ...dayBuckets[last],
      ...unlocated.map((_, k) => located.length + k),
    ];
  }

  const positions: TripItemPosition[] = [];
  const features: Record<string, unknown>[] = [];
  dayBuckets.forEach((bucket, di) => {
    const dayNumber = di + 1;
    const line: [number, number][] = [];
    bucket.forEach((idx, orderIndex) => {
      const item = all[idx];
      positions.push({ id: item.id, dayNumber, orderIndex });
      if (item.place?.location) {
        line.push([item.place.location.lng, item.place.location.lat]);
      }
    });
    if (line.length >= 2) {
      features.push({
        type: "Feature",
        properties: { day: dayNumber },
        geometry: { type: "LineString", coordinates: line },
      });
    }
  });

  const routeGeojson = { type: "FeatureCollection", features };

  await Promise.all(
    positions.map((p) =>
      supabase
        .from("trip_items")
        .update({ day_number: p.dayNumber, order_index: p.orderIndex })
        .eq("id", p.id)
        .eq("trip_id", tripId)
    )
  );
  await supabase
    .from("trips")
    .update({ route_geojson: routeGeojson })
    .eq("id", tripId);

  revalidatePath(`/trip/${tripId}`);
  const refreshed = await loadTripItems(supabase, tripId);
  return { ...trip, route_geojson: routeGeojson, items: refreshed };
}

export async function removeTripItem(itemId: string): Promise<void> {
  await requireUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("trip_items")
    .delete()
    .eq("id", itemId)
    .select("trip_id")
    .maybeSingle();
  if (error) throw new Error(`removeTripItem: ${error.message}`);
  if (data) revalidatePath(`/trip/${(data as { trip_id: string }).trip_id}`);
}

export interface UpdateTripInput {
  title?: string;
  destination?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  days?: number | null;
  coverImage?: string | null;
  isPublic?: boolean;
  routeGeojson?: Record<string, unknown> | null;
}

export async function updateTrip(
  id: string,
  patch: UpdateTripInput
): Promise<Trip> {
  await requireUser();
  const supabase = createClient();

  const update: Record<string, unknown> = {};
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.destination !== undefined) update.destination = patch.destination;
  if (patch.startDate !== undefined) update.start_date = patch.startDate;
  if (patch.endDate !== undefined) update.end_date = patch.endDate;
  if (patch.days !== undefined) update.days = patch.days;
  if (patch.coverImage !== undefined) update.cover_image = patch.coverImage;
  if (patch.routeGeojson !== undefined) update.route_geojson = patch.routeGeojson;
  if (patch.isPublic !== undefined) {
    update.is_public = patch.isPublic;
    // Ensure a share slug exists when a trip is made public.
    if (patch.isPublic) {
      const { data: existing } = await supabase
        .from("trips")
        .select("share_slug, title")
        .eq("id", id)
        .single();
      const row = existing as { share_slug: string | null; title: string } | null;
      if (row && !row.share_slug) {
        update.share_slug = slugify(patch.title ?? row.title);
      }
    }
  }

  const { data, error } = await supabase
    .from("trips")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`updateTrip: ${error.message}`);
  revalidatePath("/dashboard/trips");
  revalidatePath(`/trip/${id}`);
  return data as Trip;
}

export async function deleteTrip(id: string): Promise<void> {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.from("trips").delete().eq("id", id);
  if (error) throw new Error(`deleteTrip: ${error.message}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/trips");
}
