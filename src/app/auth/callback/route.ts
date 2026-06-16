import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Exchanges the email-confirmation / OAuth `code` for a session, then syncs the
 * onboarding preferences captured at sign-up (stored in user_metadata by the
 * sign-up form) into the user's profile row. Redirects to `next` (default
 * /dashboard) on success, or back to /auth with an error message.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const errorDescription = searchParams.get("error_description");

  const authError = (msg: string) =>
    NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(msg)}`);

  if (errorDescription) return authError(errorDescription);
  if (!code) return authError("Missing authentication code.");

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return authError(error.message);

  // Sync onboarding metadata (full_name / preferences / home_currency) into the
  // profile. The handle_new_user trigger only copies full_name + avatar_url.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    if (meta.full_name) update.full_name = meta.full_name;
    if (meta.preferences) update.preferences = meta.preferences;
    if (meta.home_currency) update.home_currency = meta.home_currency;
    if (Object.keys(update).length > 0) {
      await supabase.from("profiles").update(update).eq("id", user.id);
    }
  }

  // Behind a proxy (e.g. Vercel) honour the forwarded host in production.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";
  const base = isLocal || !forwardedHost ? origin : `https://${forwardedHost}`;
  return NextResponse.redirect(`${base}${next}`);
}
