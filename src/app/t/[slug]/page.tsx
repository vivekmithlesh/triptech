import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Calendar, Clock, Compass, MapPin } from "lucide-react";

import { getPublicTripBySlug } from "@/lib/actions/trips";
import { formatDateRange, getCategoryLabel } from "@/lib/utils";
import type { TripItem } from "@/types/database";
import { MiniTripMap } from "@/components/dashboard/MiniTripMap";
import { dayColor } from "@/lib/dayColors";
import { Button } from "@/components/ui/button";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const trip = await getPublicTripBySlug(params.slug).catch(() => null);
  if (!trip) return { title: "Trip not found" };
  const cover =
    trip.cover_image ??
    trip.items.find((i) => i.place?.cover_image)?.place?.cover_image ??
    undefined;
  const description = `${trip.destination ? `${trip.destination} · ` : ""}${
    trip.items.length
  } stops${
    formatDateRange(trip.start_date, trip.end_date)
      ? ` · ${formatDateRange(trip.start_date, trip.end_date)}`
      : ""
  } — an itinerary made with Roamio.`;
  return {
    title: trip.title,
    description,
    openGraph: {
      title: trip.title,
      description,
      images: cover ? [{ url: cover }] : undefined,
    },
  };
}

export default async function PublicTripPage({
  params,
}: {
  params: { slug: string };
}) {
  const trip = await getPublicTripBySlug(params.slug);
  if (!trip) notFound();

  const byDay = new Map<number, TripItem[]>();
  for (const it of trip.items) {
    const arr = byDay.get(it.day_number) ?? [];
    arr.push(it);
    byDay.set(it.day_number, arr);
  }
  byDay.forEach((arr) => arr.sort((a, b) => a.order_index - b.order_index));
  const days = Array.from(byDay.keys()).sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Minimal top bar */}
      <header className="border-b bg-background">
        <div className="container-page flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Compass className="h-5 w-5 text-brand" />
            Roamio
          </Link>
          <Button asChild size="sm">
            <Link href="/explore">Plan your own trip</Link>
          </Button>
        </div>
      </header>

      <main className="container-page space-y-8 py-8">
        {/* Hero */}
        <div className="space-y-2">
          <p className="section-eyebrow">Shared itinerary</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">{trip.title}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {trip.destination && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {trip.destination}
              </span>
            )}
            {formatDateRange(trip.start_date, trip.end_date) && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDateRange(trip.start_date, trip.end_date)}
              </span>
            )}
            <span>
              {days.length} day{days.length === 1 ? "" : "s"} ·{" "}
              {trip.items.length} stop{trip.items.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Map */}
        {trip.items.some((i) => i.place?.location) && (
          <div className="h-[40vh] overflow-hidden rounded-2xl border">
            <MiniTripMap items={trip.items} />
          </div>
        )}

        {/* Day-by-day */}
        {days.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
            This trip doesn&apos;t have any stops yet.
          </p>
        ) : (
          <div className="space-y-6">
            {days.map((day) => (
              <section key={day} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: dayColor(day) }}
                  />
                  <h2 className="text-lg font-semibold">Day {day}</h2>
                </div>
                <ol className="space-y-2">
                  {(byDay.get(day) ?? []).map((item, i) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl border bg-card p-3"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-light text-sm font-semibold text-brand-teal">
                        {i + 1}
                      </span>
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                        {item.place?.cover_image && (
                          <Image
                            src={item.place.cover_image}
                            alt={item.place.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {item.place?.name ?? "Place"}
                        </p>
                        <p className="flex items-center gap-2 text-xs text-muted-foreground">
                          {item.place && (
                            <span>{getCategoryLabel(item.place.category)}</span>
                          )}
                          {item.arrival_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {item.arrival_time.slice(0, 5)}
                            </span>
                          )}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}

        {/* CTA + watermark */}
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-brand-gradient px-6 py-10 text-center text-white">
          <p className="text-lg font-semibold">Like this itinerary?</p>
          <p className="text-white/85">
            Build your own optimised trip on a map in minutes.
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link href="/explore">
              Plan your own trip
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <p className="pb-4 text-center text-xs text-muted-foreground">
          Made with{" "}
          <Link href="/" className="font-medium text-brand">
            Roamio
          </Link>
        </p>
      </main>
    </div>
  );
}
