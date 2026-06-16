"use server";

import { createClient } from "@/lib/supabase/server";
import { mapFestivalRow, type FestivalRow } from "@/lib/mappers";
import type { Festival } from "@/types/database";

/** All festivals, earliest start date first. */
export async function getFestivals(): Promise<Festival[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("festivals_with_coords")
    .select("*")
    .order("start_date", { ascending: true, nullsFirst: false });
  if (error) throw new Error(`getFestivals: ${error.message}`);
  return ((data ?? []) as FestivalRow[]).map(mapFestivalRow);
}

/**
 * Festivals that are upcoming or currently running (end_date today or later),
 * soonest first.
 */
export async function getUpcomingFestivals(limit = 6): Promise<Festival[]> {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("festivals_with_coords")
    .select("*")
    .gte("end_date", today)
    .order("start_date", { ascending: true, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error(`getUpcomingFestivals: ${error.message}`);
  return ((data ?? []) as FestivalRow[]).map(mapFestivalRow);
}
