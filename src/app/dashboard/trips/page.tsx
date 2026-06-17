import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calendar, MapPin } from "lucide-react";

import { getMyTrips } from "@/lib/actions/trips";
import { formatDateRange } from "@/lib/utils";
import { CreateTripDialog } from "@/components/dashboard/CreateTripDialog";
import { DeleteTripButton } from "@/components/dashboard/DeleteTripButton";

export const metadata: Metadata = { title: "My trips" };

export default async function TripsPage() {
  const trips = await getMyTrips().catch(() => []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">My trips</h1>
          <p className="text-sm text-muted-foreground">
            {trips.length} trip{trips.length === 1 ? "" : "s"}
          </p>
        </div>
        <CreateTripDialog />
      </header>

      {trips.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-12 text-center">
          <div>
            <p className="font-medium">No trips yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first trip, then add places from Explore.
            </p>
          </div>
          <CreateTripDialog />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="flex items-start justify-between gap-3 rounded-2xl border bg-card p-5"
            >
              <div className="min-w-0 space-y-1">
                <Link
                  href={`/trip/${trip.id}`}
                  className="text-lg font-semibold hover:text-brand"
                >
                  {trip.title}
                </Link>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
                  {trip.destination && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {trip.destination}
                    </span>
                  )}
                  {formatDateRange(trip.start_date, trip.end_date) && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDateRange(trip.start_date, trip.end_date)}
                    </span>
                  )}
                  {trip.days && (
                    <span>
                      {trip.days} day{trip.days === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                <Link
                  href={`/trip/${trip.id}`}
                  className="inline-flex items-center gap-1 pt-1 text-sm font-medium text-brand"
                >
                  Open planner
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <DeleteTripButton tripId={trip.id} tripTitle={trip.title} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
