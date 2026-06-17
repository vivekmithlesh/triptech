import type { Metadata } from "next";
import Link from "next/link";

import { getSavedPlaces } from "@/lib/actions/saved";
import { PlaceCard } from "@/components/PlaceCard";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Saved places" };

export default async function SavedPage() {
  const saved = (await getSavedPlaces().catch(() => [])).filter((s) => s.place);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Saved places</h1>
        <p className="text-sm text-muted-foreground">
          {saved.length} place{saved.length === 1 ? "" : "s"} saved
        </p>
      </header>

      {saved.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-12 text-center">
          <div>
            <p className="font-medium">Nothing saved yet</p>
            <p className="text-sm text-muted-foreground">
              Tap the heart on any place and it&apos;ll show up here.
            </p>
          </div>
          <Button asChild>
            <Link href="/explore">Explore places</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {saved.map((s) => (
            <PlaceCard key={s.id} place={s.place!} initialSaved />
          ))}
        </div>
      )}
    </div>
  );
}
