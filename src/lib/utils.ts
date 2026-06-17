import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { MapPin, type LucideIcon } from "lucide-react";

import { CATEGORY_MAP } from "@/lib/constants";
import type { PlaceCategory } from "@/types/database";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "4.7", or "New" when a place has no rating yet. */
export function formatRating(rating: number | null | undefined): string {
  if (rating == null) return "New";
  return rating.toFixed(1);
}

/** Price level 1–4 → "₹"–"₹₹₹₹"; null → "" (caller decides fallback). */
export function priceLevel(level: number | null | undefined): string {
  if (level == null || level < 1) return "";
  return "₹".repeat(Math.min(level, 4));
}

/** The Lucide icon for a place category (MapPin as a safe fallback). */
export function getCategoryIcon(category: PlaceCategory): LucideIcon {
  return CATEGORY_MAP[category]?.icon ?? MapPin;
}

/** Human label for a category, e.g. "Monument". */
export function getCategoryLabel(category: PlaceCategory): string {
  return CATEGORY_MAP[category]?.singular ?? category;
}

/** "Jaipur, India" / "Paris, France" — skips empty parts. */
export function formatLocation(
  city?: string | null,
  country?: string | null
): string {
  return [city, country].filter(Boolean).join(", ");
}

/** Compact count, e.g. 52000 → "52k", 1200 → "1.2k". */
export function formatCount(n: number | null | undefined): string {
  if (!n) return "0";
  if (n < 1000) return String(n);
  if (n < 10000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
}
