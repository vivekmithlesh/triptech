import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

/** Returns the current authenticated user, or null when signed out. */
export async function getUser(): Promise<User | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Returns the current user or redirects to /auth. Use at the top of any
 * Server Component / route that requires a signed-in user.
 */
export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/auth");
  return user;
}

/** Returns the profile row for the current user, or null when signed out. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
}
