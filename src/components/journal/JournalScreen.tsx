import { getMyJournal } from "@/lib/actions/journal";
import { getMyTrips } from "@/lib/actions/trips";
import { getSavedPlaces } from "@/lib/actions/saved";
import { getPlacesByIds } from "@/lib/actions/places";
import { getMyProfile } from "@/lib/actions/profile";
import { requireUser } from "@/lib/auth";
import { safeAsync as safe } from "@/lib/observability";
import type { Place } from "@/types/database";
import { JournalView } from "@/components/journal/JournalView";

/** Server component: loads the journal data and renders the timeline. Shared by
 * /journal and /dashboard/journal. */
export async function JournalScreen({
  variant = "page",
}: {
  variant?: "page" | "dashboard";
}) {
  const user = await requireUser();
  const [entries, trips, saved, profile] = await Promise.all([
    safe(getMyJournal(), []),
    safe(getMyTrips(), []),
    safe(getSavedPlaces(), []),
    safe(getMyProfile(), null),
  ]);

  const entryPlaceIds = entries
    .map((e) => e.place_id)
    .filter((id): id is string => !!id);
  const entryPlaces = await safe(getPlacesByIds(entryPlaceIds), []);

  // Dedup saved-place + entry-place into one list (lookup + dialog options).
  const byId = new Map<string, Place>();
  for (const s of saved) if (s.place) byId.set(s.place.id, s.place);
  for (const p of entryPlaces) byId.set(p.id, p);
  const places = Array.from(byId.values());

  const colourless =
    (profile?.preferences as { colourless?: boolean } | undefined)?.colourless ===
    true;

  return (
    <JournalView
      entries={entries}
      trips={trips}
      places={places}
      userId={user.id}
      colourless={colourless}
      variant={variant}
    />
  );
}
