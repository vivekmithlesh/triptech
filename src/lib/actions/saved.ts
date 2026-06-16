"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mapPlaceRow, type PlaceRow } from "@/lib/mappers";
import type { SavedPlace } from "@/types/database";

interface SavedRow {
  id: string;
  user_id: string;
  place_id: string;
  created_at: string;
}

/** Adds or removes a place from the current user's saved list. */
export async function toggleSaved(placeId: string): Promise<{ saved: boolean }> {
  const user = await requireUser();
  const supabase = createClient();

  const { data: existing, error: selErr } = await supabase
    .from("saved_places")
    .select("id")
    .eq("user_id", user.id)
    .eq("place_id", placeId)
    .maybeSingle();
  if (selErr) throw new Error(`toggleSaved.select: ${selErr.message}`);

  if (existing) {
    const { error } = await supabase
      .from("saved_places")
      .delete()
      .eq("id", (existing as { id: string }).id);
    if (error) throw new Error(`toggleSaved.delete: ${error.message}`);
    revalidatePath("/dashboard/saved");
    return { saved: false };
  }

  const { error } = await supabase
    .from("saved_places")
    .insert({ user_id: user.id, place_id: placeId });
  if (error) throw new Error(`toggleSaved.insert: ${error.message}`);
  revalidatePath("/dashboard/saved");
  return { saved: true };
}

/** The current user's saved places, newest first, with the place populated. */
export async function getSavedPlaces(): Promise<SavedPlace[]> {
  const user = await requireUser();
  const supabase = createClient();

  const { data: savedRows, error } = await supabase
    .from("saved_places")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getSavedPlaces: ${error.message}`);

  const saved = (savedRows ?? []) as SavedRow[];
  if (saved.length === 0) return [];

  const placeIds = saved.map((s) => s.place_id);
  const { data: placeRows, error: placeErr } = await supabase
    .from("places_with_coords")
    .select("*")
    .in("id", placeIds);
  if (placeErr) throw new Error(`getSavedPlaces.places: ${placeErr.message}`);

  const placeById = new Map(
    ((placeRows ?? []) as PlaceRow[]).map((r) => [r.id, mapPlaceRow(r)])
  );

  return saved.map((s) => ({ ...s, place: placeById.get(s.place_id) }));
}

/** Just the set of place ids the current user has saved (for heart states). */
export async function getSavedPlaceIds(): Promise<string[]> {
  const user = await requireUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("saved_places")
    .select("place_id")
    .eq("user_id", user.id);
  if (error) throw new Error(`getSavedPlaceIds: ${error.message}`);
  return ((data ?? []) as { place_id: string }[]).map((r) => r.place_id);
}
