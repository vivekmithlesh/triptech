"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { addPlaceToTrip, createTrip } from "@/lib/actions/trips";
import type { Trip } from "@/types/database";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface AddToTripButtonProps {
  placeId: string;
  placeName: string;
  /** The current user's trips, or null when signed out. */
  trips: Trip[] | null;
  /** Sensible default title for a brand-new trip (e.g. the place's city). */
  defaultTripTitle?: string;
}

export function AddToTripButton({
  placeId,
  placeName,
  trips,
  defaultTripTitle,
}: AddToTripButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [localTrips, setLocalTrips] = useState<Trip[]>(trips ?? []);

  // Keep the heart/link beneath from firing when this overlay is used.
  function stop(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Signed out → send them to auth.
  if (trips === null) {
    return (
      <Button
        type="button"
        size="icon"
        variant="secondary"
        aria-label="Add to a trip"
        className="h-9 w-9 rounded-full shadow-sm"
        onClick={(e) => {
          stop(e);
          toast("Log in to save places to a trip.");
          router.push("/auth");
        }}
      >
        <Plus className="h-4 w-4" />
      </Button>
    );
  }

  function add(tripId: string, tripTitle: string) {
    startTransition(async () => {
      try {
        await addPlaceToTrip({ tripId, placeId });
        toast.success(`Added ${placeName} to ${tripTitle}`);
      } catch {
        toast.error("Couldn't add to that trip.");
      }
    });
  }

  function createAndAdd() {
    startTransition(async () => {
      try {
        const title = defaultTripTitle?.trim() || `Trip with ${placeName}`;
        const trip = await createTrip({ title, destination: defaultTripTitle ?? null });
        setLocalTrips((t) => [trip, ...t]);
        await addPlaceToTrip({ tripId: trip.id, placeId });
        toast.success(`Created “${title}” and added ${placeName}`);
      } catch {
        toast.error("Couldn't create a trip.");
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-label="Add to a trip"
          className="h-9 w-9 rounded-full shadow-sm"
          disabled={pending}
          onClick={stop}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuLabel>Add to a trip</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {localTrips.length > 0 ? (
          localTrips.map((t) => (
            <DropdownMenuItem
              key={t.id}
              onSelect={() => add(t.id, t.title)}
              className="cursor-pointer"
            >
              <span className="truncate">{t.title}</span>
            </DropdownMenuItem>
          ))
        ) : (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            No trips yet.
          </p>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={createAndAdd}
          className="cursor-pointer font-medium text-brand"
        >
          <Plus className="h-4 w-4" />
          New trip
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
