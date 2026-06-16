"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { JournalEntry } from "@/types/database";

export interface CreateEntryInput {
  body?: string | null;
  rating?: number | null;
  tripId?: string | null;
  placeId?: string | null;
  photoUrls?: string[];
  visitedAt?: string | null;
}

export async function createEntry(
  input: CreateEntryInput
): Promise<JournalEntry> {
  const user = await requireUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: user.id,
      body: input.body ?? null,
      rating: input.rating ?? null,
      trip_id: input.tripId ?? null,
      place_id: input.placeId ?? null,
      photo_urls: input.photoUrls ?? [],
      visited_at: input.visitedAt ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(`createEntry: ${error.message}`);
  revalidatePath("/journal");
  revalidatePath("/dashboard");
  return data as JournalEntry;
}

/** The current user's journal, most recently visited (or created) first. */
export async function getMyJournal(): Promise<JournalEntry[]> {
  const user = await requireUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("visited_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getMyJournal: ${error.message}`);
  return (data ?? []) as JournalEntry[];
}
