import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/** Signs the user out and sends them home. POST-only (mutating action). */
export async function POST(request: Request) {
  const supabase = createClient();
  await supabase.auth.signOut();
  // 303 forces the browser to GET "/" after this POST.
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
