"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

/** The current user's profile row, or null when signed out. */
export async function getMyProfile(): Promise<Profile | null> {
  const user = await requireUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error) throw new Error(`getMyProfile: ${error.message}`);
  return (data as Profile) ?? null;
}

export interface UpdateProfileInput {
  fullName?: string | null;
  avatarUrl?: string | null;
  homeCurrency?: string;
  preferences?: Record<string, unknown>;
}

export async function updateProfile(
  patch: UpdateProfileInput
): Promise<Profile> {
  const user = await requireUser();
  const supabase = createClient();

  const update: Record<string, unknown> = {};
  if (patch.fullName !== undefined) update.full_name = patch.fullName;
  if (patch.avatarUrl !== undefined) update.avatar_url = patch.avatarUrl;
  if (patch.homeCurrency !== undefined) update.home_currency = patch.homeCurrency;
  if (patch.preferences !== undefined) update.preferences = patch.preferences;

  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id)
    .select("*")
    .single();
  if (error) throw new Error(`updateProfile: ${error.message}`);
  revalidatePath("/dashboard");
  return data as Profile;
}

/** Toggles the journal's "colourless" (grayscale) mode, merged into preferences. */
export async function setColourlessMode(on: boolean): Promise<void> {
  const user = await requireUser();
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", user.id)
    .single();
  const prefs = {
    ...((data?.preferences ?? {}) as Record<string, unknown>),
    colourless: on,
  };
  const { error } = await supabase
    .from("profiles")
    .update({ preferences: prefs })
    .eq("id", user.id);
  if (error) throw new Error(`setColourlessMode: ${error.message}`);
  revalidatePath("/journal");
  revalidatePath("/dashboard/journal");
}
