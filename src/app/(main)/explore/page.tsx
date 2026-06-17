import type { Metadata } from "next";

import { getPlaces } from "@/lib/actions/places";
import { getMyTrips } from "@/lib/actions/trips";
import { getSavedPlaceIds } from "@/lib/actions/saved";
import { getUser } from "@/lib/auth";
import { CATEGORIES } from "@/lib/constants";
import type { PlaceCategory, PlaceFilters } from "@/types/database";
import { ExploreClient } from "@/components/explore/ExploreClient";
import type {
  ExploreFiltersState,
  SortKey,
} from "@/components/explore/ExploreFilters";

export const metadata: Metadata = {
  title: "Explore",
  description:
    "Discover the best places near any destination on a live map — cafes, monuments, beaches, viewpoints and more.",
};

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function isCategory(v: string | undefined): v is PlaceCategory {
  return !!v && CATEGORIES.some((c) => c.id === v);
}

function parseSort(v: string | undefined): SortKey {
  return v === "reviews" || v === "name" ? v : "rating";
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const category = isCategory(first(searchParams.category))
    ? (first(searchParams.category) as PlaceCategory)
    : undefined;
  const priceNum = Number(first(searchParams.price));
  const maxPrice = priceNum >= 1 && priceNum <= 4 ? priceNum : undefined;
  const ratingNum = Number(first(searchParams.rating));
  const minRating = ratingNum > 0 ? ratingNum : undefined;
  const historicOnly = first(searchParams.historic) === "1";
  const q = first(searchParams.q)?.trim() || undefined;
  const sort = parseSort(first(searchParams.sort));

  const filters: ExploreFiltersState = {
    category,
    maxPrice,
    minRating,
    historicOnly,
    q,
    sort,
  };

  const placeFilters: PlaceFilters = { ...filters, limit: 200 };

  const user = await getUser();
  const [places, trips, savedIds] = await Promise.all([
    getPlaces(placeFilters).catch(() => []),
    user ? getMyTrips().catch(() => []) : Promise.resolve(null),
    user ? getSavedPlaceIds().catch(() => []) : Promise.resolve([]),
  ]);

  return (
    <ExploreClient
      initialPlaces={places}
      initialFilters={filters}
      trips={trips}
      savedIds={savedIds}
    />
  );
}
