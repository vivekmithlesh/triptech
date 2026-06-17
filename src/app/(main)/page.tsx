import Link from "next/link";
import { ArrowRight, MapPin, Sparkles } from "lucide-react";

import { getTrendingPlaces } from "@/lib/actions/places";
import { getSavedPlaceIds } from "@/lib/actions/saved";
import { getUser } from "@/lib/auth";
import { PlaceCard } from "@/components/PlaceCard";
import { Button } from "@/components/ui/button";

// Minimal real home for Brick 06 (verifies Navbar + PlaceCard with real data).
// Brick 07 expands this into the full home page.
export default async function HomePage() {
  const user = await getUser();

  // Degrade gracefully if the catalog/views aren't set up yet (Brick 03/05).
  let trending: Awaited<ReturnType<typeof getTrendingPlaces>> = [];
  try {
    trending = await getTrendingPlaces({ limit: 8 });
  } catch {
    trending = [];
  }

  const savedIds = user ? new Set(await getSavedPlaceIds()) : new Set<string>();

  return (
    <div>
      {/* Hero */}
      <section className="bg-brand-gradient text-white">
        <div className="container-page py-20 sm:py-28">
          <div className="max-w-2xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm">
              <Sparkles className="h-4 w-4" />
              Your AI travel companion
            </span>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Drop a destination. Get a smart trip on a map.
            </h1>
            <p className="text-lg text-white/85">
              Discover the best places, plan an optimised day-by-day itinerary,
              and ask an AI guide grounded in verified local knowledge.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link href="/explore">
                  <MapPin className="h-4 w-4" />
                  Explore the map
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="bg-white/10 text-white hover:bg-white/20"
              >
                <Link href="/assistant">
                  Ask the AI guide
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Trending */}
      <section className="container-page py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="section-eyebrow">Trending now</p>
            <h2 className="text-2xl font-semibold">Most-saved places</h2>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/explore">
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {trending.length === 0 ? (
          <p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
            No places yet. Run the seed to populate the catalog.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {trending.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                initialSaved={savedIds.has(place.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
