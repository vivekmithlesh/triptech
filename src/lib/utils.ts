import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isValid, parseISO } from "date-fns";
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

/**
 * Human date range from ISO date strings, collapsing shared parts:
 * "14 Mar 2026", "14–17 Mar 2026", "28 Feb – 3 Mar 2026",
 * "28 Dec 2026 – 2 Jan 2027". Returns "" when start is missing/invalid.
 */
export function formatDateRange(
  start?: string | null,
  end?: string | null
): string {
  if (!start) return "";
  const s = parseISO(start);
  if (!isValid(s)) return "";

  const e = end ? parseISO(end) : null;
  if (!e || !isValid(e) || +e === +s) return format(s, "d MMM yyyy");

  const sameYear = s.getFullYear() === e.getFullYear();
  const sameMonth = sameYear && s.getMonth() === e.getMonth();

  if (sameMonth) return `${format(s, "d")}–${format(e, "d MMM yyyy")}`;
  if (sameYear) return `${format(s, "d MMM")} – ${format(e, "d MMM yyyy")}`;
  return `${format(s, "d MMM yyyy")} – ${format(e, "d MMM yyyy")}`;
}
