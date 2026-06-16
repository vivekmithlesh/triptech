/**
 * Roamio database reset script — wipes all seed content for a clean slate.
 *
 * Deletes (in FK-safe order):
 *   - kb_chunks, trip_items, saved_places, journal_entries, places, festivals
 *   - the three demo users (cascades their profiles + any owned trips/saved/journal)
 *
 * It does NOT touch the schema, RPCs, RLS, or any real (non-demo) auth users.
 * Re-seed afterwards with:  npx tsx scripts/seed.ts
 *
 * Run with:  npx tsx scripts/reset.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient, type PostgrestError } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Must match the demo accounts created in scripts/seed.ts.
const DEMO_EMAILS = ["demo1@roamio.test", "demo2@roamio.test", "demo3@roamio.test"];

function fail(context: string, error: PostgrestError | { message: string } | null): void {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

async function main(): Promise<void> {
  const sentinel = "00000000-0000-0000-0000-000000000000";

  // 1) Clear catalog + content tables (FK-safe order: children before parents).
  console.log("Clearing seed content (kb_chunks, trip_items, saved_places, journal_entries, places, festivals)...");
  for (const table of [
    "kb_chunks",
    "trip_items",
    "saved_places",
    "journal_entries",
    "places",
    "festivals",
  ] as const) {
    const { error } = await supabase.from(table).delete().neq("id", sentinel);
    fail(`Failed clearing ${table}`, error);
  }

  // 2) Delete the demo users (cascades profiles + any rows they own).
  let usersDeleted = 0;
  const list = await supabase.auth.admin.listUsers();
  if (list.error) {
    throw new Error(`Failed listing users: ${list.error.message}`);
  }
  for (const email of DEMO_EMAILS) {
    const existing = list.data.users.find((u) => u.email === email);
    if (!existing) {
      console.log(`Demo user ${email} not found — skipping.`);
      continue;
    }
    const { error } = await supabase.auth.admin.deleteUser(existing.id);
    fail(`Failed deleting demo user ${email}`, error);
    usersDeleted += 1;
    console.log(`Deleted demo user ${email}.`);
  }

  // 3) Summary.
  console.log("\n=== Roamio reset summary ===");
  console.log(`Demo users deleted: ${usersDeleted} / ${DEMO_EMAILS.length}`);
  console.log("Places / festivals / kb_chunks cleared.");
  console.log("Re-seed with: npx tsx scripts/seed.ts");
  console.log("============================\n");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
