"use server";

import { createClient } from "@/lib/supabase/server";
import type { KbChunk } from "@/types/database";

/**
 * Verified knowledge-base chunks for a place (the "history" section).
 * Selects explicit columns so the pgvector `embedding` column is never
 * pulled through the REST API.
 */
export async function getPlaceHistory(placeId: string): Promise<KbChunk[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("kb_chunks")
    .select("id, place_id, content, source, verified, created_at")
    .eq("place_id", placeId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`getPlaceHistory: ${error.message}`);
  return (data ?? []) as KbChunk[];
}
