import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Compass,
  Heart,
  MapPin,
  MessageSquare,
  Quote,
  Search,
  Sparkles,
  Wand2,
} from "lucide-react";

import {
  getCatalogStats,
  getCategoryCounts,
  getTrendingPlaces,
} from "@/lib/actions/places";
import { getUpcomingFestivals } from "@/lib/actions/festivals";
import { getSavedPlaceIds } from "@/lib/actions/saved";
import { getUser } from "@/lib/auth";
import { CATEGORIES, type CategoryMeta } from "@/lib/constants";
import { cn, formatDateRange, formatLocation } from "@/lib/utils";
import { PlaceCard } from "@/components/PlaceCard";
import { DestinationSearch } from "@/components/home/DestinationSearch";
import { Reveal } from "@/components/home/Reveal";
import { Button } from "@/components/ui/button";

// Degrade gracefully if the catalog/views aren't seeded yet (Bricks 03/05).
async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

const HOW_IT_WORKS = [
  {
    icon: Search,
    title: "Search a destination",
    body: "Drop a city and discover the best places near any point — real spots from a curated catalog.",
  },
  {
    icon: Heart,
    title: "Add the places you love",
    body: "Save monuments, cafes, beaches and viewpoints to a trip as you explore the map.",
  },
  {
    icon: Wand2,
    title: "Get an optimised itinerary",
    body: "We order your stops into a smart day-by-day route on the map — ready to travel.",
  },
] as const;

// Static marketing testimonials (landing-page copy, not DB records).
const TESTIMONIALS = [
  {
    quote:
      "Landed in Jaipur clueless and had a perfect day mapped out in minutes. The AI guide knew the history of every fort.",
    name: "Aarti S.",
    trip: "3 days in Rajasthan",
  },
  {
    quote:
      "The route optimiser saved us hours of backtracking in Goa. We just followed the map, beach to beach.",
    name: "Marco D.",
    trip: "Beach week, Goa",
  },
  {
    quote:
      "Finally a travel app that doesn't make things up. Every answer was grounded in real, verified info.",
    name: "Priya K.",
    trip: "Temples of Bangkok",
  },
] as const;

export default async function HomePage() {
  const user = await getUser();

  const [trending, festivals, counts, stats] = await Promise.all([
    safe(getTrendingPlaces({ limit: 8 }), [] as Awaited<
      ReturnType<typeof getTrendingPlaces>
    >),
    safe(getUpcomingFestivals(3), [] as Awaited<
      ReturnType<typeof getUpcomingFestivals>
    >),
    safe(getCategoryCounts(), {} as Awaited<
      ReturnType<typeof getCategoryCounts>
    >),
    safe(getCatalogStats(), { places: 0, cities: 0, countries: 0 }),
  ]);

  const savedIds = user
    ? new Set(await safe(getSavedPlaceIds(), [] as string[]))
    : new Set<string>();

  const browseCategories: CategoryMeta[] = CATEGORIES.filter(
    (c) => (counts[c.id] ?? 0) > 0
  );

  return (
    <div>
      {/* ---------------------------------------------------------------- Hero */}
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

            <DestinationSearch />

            {stats.places > 0 && (
              <p className="text-sm text-white/80">
                <span className="font-semibold text-white">
                  {stats.places}+
                </span>{" "}
                curated places ·{" "}
                <span className="font-semibold text-white">{stats.cities}</span>{" "}
                cities ·{" "}
                <span className="font-semibold text-white">
                  {stats.countries}
                </span>{" "}
                countries
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- Browse by category */}
      {browseCategories.length > 0 && (
        <section className="container-page py-14">
          <Reveal>
            <p className="section-eyebrow">Browse by category</p>
            <h2 className="mb-6 text-2xl font-semibold">
              What kind of place are you after?
            </h2>
          </Reveal>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {browseCategories.map((c, i) => {
              const Icon = c.icon;
              return (
                <Reveal key={c.id} delay={i * 0.03}>
                  <Link
                    href={`/explore?category=${c.id}`}
                    className="group flex h-full flex-col items-start gap-3 rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-light text-brand">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-medium group-hover:text-brand">
                      {c.label}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {counts[c.id]} place{counts[c.id] === 1 ? "" : "s"}
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------ Trending places */}
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
            {trending.map((place, i) => (
              <Reveal key={place.id} delay={(i % 4) * 0.04}>
                <PlaceCard place={place} initialSaved={savedIds.has(place.id)} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* --------------------------------------------------- AI Guide spotlight */}
      <section className="container-page py-6">
        <Reveal>
          <div className="overflow-hidden rounded-2xl bg-brand-gradient text-white">
            <div className="grid items-center gap-8 p-8 sm:p-12 lg:grid-cols-2">
              <div className="space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm">
                  <Sparkles className="h-4 w-4" />
                  AI Guide + Receptionist
                </span>
                <h2 className="text-2xl font-semibold sm:text-3xl">
                  Just landed? Ask anything, get a local answer.
                </h2>
                <p className="text-white/85">
                  A conversational guide grounded in verified data — the history
                  of a monument, a fair taxi fare, where to eat first. It never
                  invents facts; if it doesn&apos;t know, it says so.
                </p>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/assistant">
                    <MessageSquare className="h-4 w-4" />
                    Ask the AI guide
                  </Link>
                </Button>
              </div>
              <ul className="space-y-3">
                {[
                  "I just landed in Jaipur — what now?",
                  "Plan me 3 days in Goa",
                  "What's the history of this fort?",
                ].map((prompt) => (
                  <li
                    key={prompt}
                    className="rounded-xl bg-white/10 px-4 py-3 text-sm backdrop-blur"
                  >
                    “{prompt}”
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ----------------------------------------------------------- How it works */}
      <section className="container-page py-14">
        <Reveal>
          <p className="section-eyebrow">How it works</p>
          <h2 className="mb-8 text-2xl font-semibold">
            Plan a trip in 60 seconds
          </h2>
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-3">
          {HOW_IT_WORKS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.title} delay={i * 0.05}>
                <div className="h-full rounded-xl border bg-card p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-light text-brand">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground">
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="mb-1 font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* -------------------------------------------------------- Festival strip */}
      {festivals.length > 0 && (
        <section className="bg-muted/30 py-14">
          <div className="container-page">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="section-eyebrow">Don&apos;t miss</p>
                <h2 className="text-2xl font-semibold">Upcoming festivals</h2>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/festivals">
                  Festival calendar
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {festivals.map((f, i) => (
                <Reveal key={f.id} delay={i * 0.05}>
                  <Link
                    href="/festivals"
                    className="group flex h-full flex-col gap-2 rounded-xl border bg-card p-5 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-center gap-2 text-sm text-brand">
                      <Calendar className="h-4 w-4" />
                      {formatDateRange(f.start_date, f.end_date) || "Dates TBA"}
                    </div>
                    <h3 className="font-semibold group-hover:text-brand">
                      {f.name}
                    </h3>
                    {(f.city || f.country) && (
                      <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {formatLocation(f.city, f.country)}
                      </p>
                    )}
                    {f.significance && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {f.significance}
                      </p>
                    )}
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* --------------------------------------------------------- Journal teaser */}
      <section className="container-page py-14">
        <Reveal>
          <div className="grid items-center gap-8 rounded-2xl border bg-card p-8 sm:p-12 lg:grid-cols-2">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-light px-3 py-1 text-sm text-brand-teal">
                <BookOpen className="h-4 w-4" />
                Travel journal
              </span>
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Every trip becomes a story worth keeping.
              </h2>
              <p className="text-muted-foreground">
                Your trips turn into an automatic timeline. Add photos, ratings
                and notes as you go — or switch to a quiet, colourless mode for a
                minimal memory book.
              </p>
              <Button asChild variant="outline">
                <Link href="/journal">
                  Open your journal
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[Compass, MapPin, Heart].map((Icon, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-xl",
                    i === 1 ? "bg-brand text-white" : "bg-brand-light text-brand"
                  )}
                >
                  <Icon className="h-8 w-8" />
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* --------------------------------------------------------- Testimonials */}
      <section className="container-page py-14">
        <Reveal>
          <p className="section-eyebrow">Loved by travellers</p>
          <h2 className="mb-8 text-2xl font-semibold">
            People who travel smarter with Roamio
          </h2>
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.05}>
              <figure className="flex h-full flex-col rounded-xl border bg-card p-6">
                <Quote className="mb-3 h-6 w-6 text-brand/40" />
                <blockquote className="flex-1 text-sm text-foreground/90">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="font-semibold">{t.name}</span>
                  <span className="text-muted-foreground"> · {t.trip}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------- Final CTA */}
      <section className="container-page pb-20">
        <Reveal>
          <div className="flex flex-col items-center gap-5 rounded-2xl bg-brand-deep px-6 py-14 text-center text-white">
            <h2 className="max-w-xl text-2xl font-semibold sm:text-3xl">
              Travel the world with an AI in your pocket.
            </h2>
            <p className="max-w-md text-white/80">
              Start exploring the map, or let the AI guide plan your next trip.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link href="/explore">
                  <MapPin className="h-4 w-4" />
                  Explore the map
                </Link>
              </Button>
              {!user && (
                <Button
                  asChild
                  size="lg"
                  className="bg-white/10 text-white hover:bg-white/20"
                >
                  <Link href="/auth">
                    Create a free account
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
