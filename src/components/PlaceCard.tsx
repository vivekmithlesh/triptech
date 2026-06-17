"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition, type MouseEvent } from "react";
import { Heart, Star } from "lucide-react";
import { toast } from "sonner";

import { toggleSaved } from "@/lib/actions/saved";
import {
  cn,
  formatCount,
  formatLocation,
  formatRating,
  getCategoryIcon,
  getCategoryLabel,
  priceLevel,
} from "@/lib/utils";
import type { Place } from "@/types/database";

export interface PlaceCardProps {
  place: Place;
  /** Whether the current user has already saved this place. */
  initialSaved?: boolean;
  className?: string;
}

export function PlaceCard({ place, initialSaved = false, className }: PlaceCardProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();
  const Icon = getCategoryIcon(place.category);
  const price = priceLevel(place.price_level);

  function onToggleSave(e: MouseEvent) {
    // The card is a link — keep the heart click local.
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;

    const optimistic = !saved;
    setSaved(optimistic);
    startTransition(async () => {
      try {
        const res = await toggleSaved(place.id);
        setSaved(res.saved);
        if (res.saved) toast.success(`Saved ${place.name}`);
        else toast(`Removed ${place.name}`);
      } catch {
        setSaved(!optimistic);
        toast.error("Couldn't update your saved places.");
      }
    });
  }

  return (
    <Link
      href={`/place/${place.id}`}
      className={cn(
        "group block overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {place.cover_image ? (
          <Image
            src={place.cover_image}
            alt={place.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Icon className="h-10 w-10" />
          </div>
        )}

        {/* Category chip */}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur">
          <Icon className="h-3.5 w-3.5 text-brand" />
          {getCategoryLabel(place.category)}
        </span>

        {/* Save heart */}
        <button
          type="button"
          onClick={onToggleSave}
          aria-label={saved ? "Remove from saved" : "Save place"}
          aria-pressed={saved}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 shadow-sm backdrop-blur transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          disabled={pending}
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-colors",
              saved ? "fill-rose-500 text-rose-500" : "text-foreground"
            )}
          />
        </button>

        {place.is_historic && (
          <span className="absolute bottom-3 left-3 rounded-full bg-brand-deep/85 px-2.5 py-0.5 text-xs font-medium text-white">
            Historic
          </span>
        )}
      </div>

      <div className="space-y-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-semibold leading-tight group-hover:text-brand">
            {place.name}
          </h3>
          {price && (
            <span className="shrink-0 text-sm text-muted-foreground">{price}</span>
          )}
        </div>

        <p className="line-clamp-2 text-sm text-muted-foreground">
          {formatLocation(place.city, place.country)}
        </p>

        <div className="flex items-center gap-1.5 pt-0.5 text-sm">
          <Star className="h-4 w-4 fill-brand-sand text-brand-sand" />
          <span className="font-medium">{formatRating(place.rating)}</span>
          {place.review_count > 0 && (
            <span className="text-muted-foreground">
              ({formatCount(place.review_count)})
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
