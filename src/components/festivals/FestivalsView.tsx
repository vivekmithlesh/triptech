"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";

import type { Festival } from "@/types/database";
import { formatDateRange, formatLocation } from "@/lib/utils";
import { PlanTripButton } from "@/components/PlanTripButton";

const FestivalMap = dynamic(() => import("@/components/FestivalMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
});

export function FestivalsView({
  festivals,
  loggedIn,
}: {
  festivals: Festival[];
  loggedIn: boolean;
}) {
  return (
    <div className="container-page space-y-8 py-8">
      <header>
        <p className="section-eyebrow">World festivals</p>
        <h1 className="text-3xl font-semibold">Festival calendar</h1>
        <p className="mt-1 text-muted-foreground">
          Discover what&apos;s happening where — and plan a trip around it.
        </p>
      </header>

      {festivals.length === 0 ? (
        <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          No festivals yet. Run the seed to populate the calendar.
        </p>
      ) : (
        <>
          <div className="h-[45vh] overflow-hidden rounded-2xl border">
            <FestivalMap festivals={festivals} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {festivals.map((f) => (
              <article
                key={f.id}
                className="flex flex-col gap-3 rounded-2xl border bg-card p-5"
              >
                <div className="flex items-center gap-2 text-sm text-brand">
                  <Calendar className="h-4 w-4" />
                  {formatDateRange(f.start_date, f.end_date) || "Dates TBA"}
                </div>
                <div>
                  <h2 className="font-semibold">{f.name}</h2>
                  {(f.city || f.country) && (
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {formatLocation(f.city, f.country)}
                    </p>
                  )}
                </div>
                {f.significance && (
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {f.significance}
                  </p>
                )}
                <div className="mt-auto flex flex-wrap gap-2 pt-1">
                  {f.city && (
                    <Link
                      href={`/destination/${encodeURIComponent(f.city)}`}
                      className="inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                    >
                      Destination
                    </Link>
                  )}
                  {f.city && (
                    <PlanTripButton
                      title={`${f.name} trip`}
                      destination={f.city}
                      startDate={f.start_date}
                      endDate={f.end_date}
                      loggedIn={loggedIn}
                      label="Plan a trip"
                      className="flex-1"
                    />
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
