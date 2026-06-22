import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Coins,
  Compass,
  Heart,
  MapPin,
  Sparkles,
} from "lucide-react";

import { getMyProfile } from "@/lib/actions/profile";
import { getMyTrips, getTripById } from "@/lib/actions/trips";
import { getSavedPlaces } from "@/lib/actions/saved";
import { getMyJournal } from "@/lib/actions/journal";
import { getFestivalAlertsForUser } from "@/lib/actions/weather";
import { formatDateRange } from "@/lib/utils";
import { safeAsync as safe } from "@/lib/observability";
import { PlaceCard } from "@/components/PlaceCard";
import { CreateTripDialog } from "@/components/dashboard/CreateTripDialog";
import { MiniTripMap } from "@/components/dashboard/MiniTripMap";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardOverview() {
  const profile = await safe(getMyProfile(), null);
  const [trips, saved, journal, festivalAlerts] = await Promise.all([
    safe(getMyTrips(), []),
    safe(getSavedPlaces(), []),
    safe(getMyJournal(), []),
    safe(getFestivalAlertsForUser(), []),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming =
    trips
      .filter((t) => t.start_date && t.start_date >= today)
      .sort((a, b) => (a.start_date! < b.start_date! ? -1 : 1))[0] ??
    trips[0] ??
    null;
  const upcomingFull = upcoming
    ? await safe(getTripById(upcoming.id), null)
    : null;
  const upcomingItems = upcomingFull?.items ?? [];

  const stats = [
    { label: "Trips", value: trips.length, icon: MapPin },
    { label: "Saved places", value: saved.length, icon: Heart },
    { label: "Journal entries", value: journal.length, icon: BookOpen },
    { label: "TripCoins", value: profile?.tripcoins ?? 0, icon: Coins },
  ];

  const savedPreview = saved.filter((s) => s.place).slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {festivalAlerts.length > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl border border-brand/30 bg-brand-light/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white">
              <Bell className="h-4 w-4" />
            </span>
            <div className="text-sm">
              <p className="font-medium">Festivals coming up near your saved places</p>
              <p className="text-muted-foreground">
                {festivalAlerts
                  .slice(0, 3)
                  .map(
                    (f) =>
                      `${f.name} (${f.city}${
                        formatDateRange(f.start_date, f.end_date)
                          ? `, ${formatDateRange(f.start_date, f.end_date)}`
                          : ""
                      })`
                  )
                  .join(" · ")}
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/festivals">
              View festivals
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            Your trips, saved places and journal — all in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CreateTripDialog />
          <Button asChild variant="outline">
            <Link href="/explore">
              <Compass className="h-4 w-4" />
              Explore
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/assistant">
              <Sparkles className="h-4 w-4 text-brand" />
              Ask AI
            </Link>
          </Button>
        </div>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <s.icon className="h-4 w-4 text-brand" />
              {s.label}
            </div>
            <p className="mt-2 text-3xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Upcoming trip */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Upcoming trip</h2>
        {upcomingFull ? (
          <div className="grid gap-4 overflow-hidden rounded-2xl border bg-card lg:grid-cols-[1fr_360px]">
            <div className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold">{upcomingFull.title}</h3>
                  <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                    {upcomingFull.destination && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {upcomingFull.destination}
                      </span>
                    )}
                    {formatDateRange(
                      upcomingFull.start_date,
                      upcomingFull.end_date
                    ) && (
                      <span>
                        {formatDateRange(
                          upcomingFull.start_date,
                          upcomingFull.end_date
                        )}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {upcomingItems.length} stop
                {upcomingItems.length === 1 ? "" : "s"} planned
              </p>
              <Button asChild>
                <Link href={`/trip/${upcomingFull.id}`}>
                  Open planner
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="h-56 lg:h-auto">
              {upcomingItems.some((i) => i.place?.location) ? (
                <MiniTripMap items={upcomingItems} />
              ) : (
                <div className="flex h-full items-center justify-center bg-muted text-sm text-muted-foreground">
                  Add places to see the map
                </div>
              )}
            </div>
          </div>
        ) : (
          <EmptyState
            title="No trips yet"
            body="Plan your first trip and start adding places."
            action={<CreateTripDialog />}
          />
        )}
      </section>

      {/* Saved places */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Saved places</h2>
          {savedPreview.length > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/saved">
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
        {savedPreview.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {savedPreview.map((s) => (
              <PlaceCard key={s.id} place={s.place!} initialSaved />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nothing saved yet"
            body="Tap the heart on any place to save it here."
            action={
              <Button asChild>
                <Link href="/explore">Explore places</Link>
              </Button>
            }
          />
        )}
      </section>

      {/* Recent journal */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent journal</h2>
          {journal.length > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/journal">
                Open journal
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
        {journal.length > 0 ? (
          <ul className="space-y-2">
            {journal.slice(0, 3).map((e) => (
              <li key={e.id} className="rounded-xl border bg-card p-4">
                {e.rating != null && (
                  <p className="text-sm font-medium text-brand">
                    {"★".repeat(e.rating)}
                  </p>
                )}
                <p className="line-clamp-2 text-sm">{e.body ?? "—"}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Your journal is empty"
            body="Memories from your trips will appear here."
          />
        )}
      </section>
    </div>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-10 text-center">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
      {action}
    </div>
  );
}
