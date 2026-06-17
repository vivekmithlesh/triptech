import {
  Building2,
  Coffee,
  Landmark,
  type LucideIcon,
  Mountain,
  ShoppingBag,
  Sparkles,
  Trees,
  UtensilsCrossed,
  Waves,
} from "lucide-react";

import type { PlaceCategory } from "@/types/database";

export interface CategoryMeta {
  id: PlaceCategory;
  /** Plural label for filter chips / browse tiles. */
  label: string;
  /** Singular label for a single place. */
  singular: string;
  icon: LucideIcon;
}

// Canonical place-category metadata — the single source of truth for labels
// and icons across the app (filters, cards, place detail, getCategoryIcon).
export const CATEGORIES: readonly CategoryMeta[] = [
  { id: "monument", label: "Monuments", singular: "Monument", icon: Landmark },
  { id: "attraction", label: "Attractions", singular: "Attraction", icon: Sparkles },
  { id: "viewpoint", label: "Viewpoints", singular: "Viewpoint", icon: Mountain },
  { id: "beach", label: "Beaches", singular: "Beach", icon: Waves },
  { id: "museum", label: "Museums", singular: "Museum", icon: Building2 },
  { id: "park", label: "Parks", singular: "Park", icon: Trees },
  { id: "cafe", label: "Cafes", singular: "Cafe", icon: Coffee },
  { id: "restaurant", label: "Restaurants", singular: "Restaurant", icon: UtensilsCrossed },
  { id: "hotel", label: "Hotels", singular: "Hotel", icon: Building2 },
  { id: "market", label: "Markets", singular: "Market", icon: ShoppingBag },
] as const;

export const CATEGORY_MAP: Record<PlaceCategory, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
) as Record<PlaceCategory, CategoryMeta>;

// Featured destinations used by the home hero + search suggestions.
export interface DestinationMeta {
  city: string;
  country: string;
  blurb: string;
}

export const POPULAR_DESTINATIONS: readonly DestinationMeta[] = [
  { city: "Jaipur", country: "India", blurb: "Pink City forts & palaces" },
  { city: "Delhi", country: "India", blurb: "Mughal monuments & markets" },
  { city: "Goa", country: "India", blurb: "Beaches & seafood shacks" },
  { city: "Manali", country: "India", blurb: "Himalayan valleys" },
  { city: "Varanasi", country: "India", blurb: "Ganges ghats & aarti" },
  { city: "Bangkok", country: "Thailand", blurb: "Temples & street food" },
  { city: "Bali", country: "Indonesia", blurb: "Sea temples & rice terraces" },
  { city: "Paris", country: "France", blurb: "Art, cafes & icons" },
] as const;

// Travel "vibes" captured at onboarding and used to theme suggestions.
export interface VibeMeta {
  id: string;
  label: string;
}

export const VIBES: readonly VibeMeta[] = [
  { id: "history", label: "History & heritage" },
  { id: "food", label: "Food & cafes" },
  { id: "nature", label: "Nature & outdoors" },
  { id: "beaches", label: "Beaches" },
  { id: "nightlife", label: "Nightlife" },
  { id: "art", label: "Art & museums" },
  { id: "adventure", label: "Adventure" },
  { id: "shopping", label: "Shopping" },
] as const;

// Budget bands map to a price_level ceiling (1–4) for filtering.
export interface BudgetBand {
  id: string;
  label: string;
  /** Inclusive max price_level this band allows. */
  maxPrice: number;
}

export const BUDGET_BANDS: readonly BudgetBand[] = [
  { id: "shoestring", label: "Shoestring", maxPrice: 1 },
  { id: "budget", label: "Budget", maxPrice: 2 },
  { id: "balanced", label: "Balanced", maxPrice: 3 },
  { id: "luxury", label: "Luxury", maxPrice: 4 },
] as const;

// Primary navigation, reused by the desktop bar and the mobile sheet.
export interface NavItem {
  href: string;
  label: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/explore", label: "Explore" },
  { href: "/dashboard/trips", label: "Trips" },
  { href: "/festivals", label: "Festivals" },
  { href: "/journal", label: "Journal" },
] as const;
