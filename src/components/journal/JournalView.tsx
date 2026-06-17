"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { Contrast, MapPin, Repeat, Route, Star } from "lucide-react";
import { toast } from "sonner";

import { setColourlessMode } from "@/lib/actions/profile";
import { cn, formatDateRange } from "@/lib/utils";
import type { JournalEntry, Place, Trip } from "@/types/database";
import { AddMemoryDialog } from "@/components/journal/AddMemoryDialog";
import { Button } from "@/components/ui/button";

type TimelineItem =
  | { kind: "entry"; date: string; entry: JournalEntry }
  | { kind: "trip"; date: string; trip: Trip };

export function JournalView({
  entries,
  trips,
  places,
  userId,
  colourless: initialColourless,
  variant = "page",
}: {
  entries: JournalEntry[];
  trips: Trip[];
  places: Place[];
  userId: string;
  colourless: boolean;
  variant?: "page" | "dashboard";
}) {
  const [colourless, setColourless] = useState(initialColourless);
  const [, startTransition] = useTransition();

  const placeById = new Map(places.map((p) => [p.id, p]));
  const placeCounts = entries.reduce<Record<string, number>>((m, e) => {
    if (e.place_id) m[e.place_id] = (m[e.place_id] ?? 0) + 1;
    return m;
  }, {});

  const items: TimelineItem[] = [
    ...entries.map(
      (e): TimelineItem => ({
        kind: "entry",
        date: e.visited_at ?? e.created_at,
        entry: e,
      })
    ),
    ...trips.map(
      (t): TimelineItem => ({
        kind: "trip",
        date: t.start_date ?? t.created_at,
        trip: t,
      })
    ),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  function toggleColourless() {
    const next = !colourless;
    setColourless(next);
    startTransition(async () => {
      try {
        await setColourlessMode(next);
      } catch {
        setColourless(!next);
        toast.error("Couldn't update colourless mode.");
      }
    });
  }

  return (
    <div className={variant === "page" ? "container-page py-8" : ""}>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-eyebrow">Travel journal</p>
          <h1 className="text-2xl font-semibold">Your memories</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={colourless ? "default" : "outline"}
            size="sm"
            onClick={toggleColourless}
            aria-pressed={colourless}
          >
            <Contrast className="h-4 w-4" />
            Colourless
          </Button>
          <AddMemoryDialog trips={trips} places={places} userId={userId} />
        </div>
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
          <p className="font-medium text-foreground">No memories yet</p>
          <p className="text-sm">
            Add your first memory, or plan a trip — your timeline builds itself.
          </p>
        </div>
      ) : (
        <ol
          className={cn(
            "relative space-y-6 border-l pl-6 transition-[filter] duration-300",
            colourless && "grayscale"
          )}
        >
          {items.map((item, i) =>
            item.kind === "trip" ? (
              <TripRow key={`t-${item.trip.id}-${i}`} trip={item.trip} />
            ) : (
              <EntryRow
                key={`e-${item.entry.id}`}
                entry={item.entry}
                place={item.entry.place_id ? placeById.get(item.entry.place_id) : undefined}
                trip={item.entry.trip_id ? trips.find((t) => t.id === item.entry.trip_id) : undefined}
                reunion={
                  item.entry.place_id ? (placeCounts[item.entry.place_id] ?? 0) > 1 : false
                }
              />
            )
          )}
        </ol>
      )}
    </div>
  );
}

function Dot({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "absolute -left-[31px] mt-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background",
        className
      )}
    />
  );
}

function TripRow({ trip }: { trip: Trip }) {
  return (
    <li className="relative">
      <Dot className="bg-brand-sky" />
      <Link
        href={`/trip/${trip.id}`}
        className="flex items-center gap-2 rounded-xl border bg-muted/30 px-4 py-3 transition-shadow hover:shadow-sm"
      >
        <Route className="h-4 w-4 text-brand-sky" />
        <span className="font-medium">{trip.title}</span>
        <span className="text-sm text-muted-foreground">
          {formatDateRange(trip.start_date, trip.end_date) || "Trip"}
        </span>
      </Link>
    </li>
  );
}

function EntryRow({
  entry,
  place,
  trip,
  reunion,
}: {
  entry: JournalEntry;
  place?: Place;
  trip?: Trip;
  reunion: boolean;
}) {
  const when = entry.visited_at ?? entry.created_at;
  return (
    <li className="relative">
      <Dot className="bg-brand" />
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{format(parseISO(when), "d MMM yyyy")}</span>
          {entry.rating != null && entry.rating > 0 && (
            <span className="flex items-center gap-0.5 text-brand-sand">
              {Array.from({ length: entry.rating }).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-current" />
              ))}
            </span>
          )}
          {reunion && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-light px-2 py-0.5 text-xs font-medium text-brand-teal">
              <Repeat className="h-3 w-3" />
              Reunion
            </span>
          )}
        </div>

        {entry.body && (
          <p className="whitespace-pre-wrap text-foreground/90">{entry.body}</p>
        )}

        {entry.photo_urls.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {entry.photo_urls.map((url) => (
              <div
                key={url}
                className="relative aspect-square overflow-hidden rounded-lg bg-muted"
              >
                <Image
                  src={url}
                  alt="Journal photo"
                  fill
                  sizes="(max-width: 640px) 33vw, 160px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {(place || trip) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {place && (
              <Link
                href={`/place/${place.id}`}
                className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-accent"
              >
                <MapPin className="h-3 w-3 text-brand" />
                {place.name}
              </Link>
            )}
            {trip && (
              <Link
                href={`/trip/${trip.id}`}
                className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-accent"
              >
                <Route className="h-3 w-3 text-brand-sky" />
                {trip.title}
              </Link>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
