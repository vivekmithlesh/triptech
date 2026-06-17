"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { List, MapIcon, Search, X } from "lucide-react";

import { getPlacesInBounds } from "@/lib/actions/places";
import type { MapBounds, Place, Trip } from "@/types/database";
import { cn } from "@/lib/utils";
import { PlaceCard } from "@/components/PlaceCard";
import { AddToTripButton } from "@/components/explore/AddToTripButton";
import {
  ExploreFilters,
  type ExploreFiltersState,
} from "@/components/explore/ExploreFilters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

// Map is browser-only (Leaflet) — load it without SSR.
const PlaceMap = dynamic(() => import("@/components/PlaceMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
});

function applyFilters(places: Place[], f: ExploreFiltersState): Place[] {
  const q = f.q?.toLowerCase().trim();
  return places.filter((p) => {
    if (f.category && p.category !== f.category) return false;
    if (f.maxPrice != null && (p.price_level ?? 99) > f.maxPrice) return false;
    if (f.minRating != null && (p.rating ?? 0) < f.minRating) return false;
    if (f.historicOnly && !p.is_historic) return false;
    if (q) {
      const hay = `${p.name} ${p.city ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function buildQuery(f: ExploreFiltersState): string {
  const p = new URLSearchParams();
  if (f.category) p.set("category", f.category);
  if (f.maxPrice) p.set("price", String(f.maxPrice));
  if (f.minRating) p.set("rating", String(f.minRating));
  if (f.historicOnly) p.set("historic", "1");
  if (f.q) p.set("q", f.q);
  if (f.sort !== "rating") p.set("sort", f.sort);
  return p.toString();
}

export function ExploreClient({
  initialPlaces,
  initialFilters,
  trips,
  savedIds,
}: {
  initialPlaces: Place[];
  initialFilters: ExploreFiltersState;
  trips: Trip[] | null;
  savedIds: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const filterSig = JSON.stringify(initialFilters);
  const [filters, setFilters] = useState<ExploreFiltersState>(initialFilters);
  const [places, setPlaces] = useState<Place[]>(initialPlaces);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [boundsLoading, setBoundsLoading] = useState(false);
  const [searchText, setSearchText] = useState(initialFilters.q ?? "");

  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const boundsTimer = useRef<ReturnType<typeof setTimeout>>();

  // When the URL-driven filters change (server re-render or back/forward),
  // re-sync local state and the displayed list, and trigger a map re-fit.
  useEffect(() => {
    setFilters(initialFilters);
    setPlaces(initialPlaces);
    setSearchText(initialFilters.q ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSig]);

  const pushFilters = useCallback(
    (next: ExploreFiltersState) => {
      const qs = buildQuery(next);
      startTransition(() => {
        router.push(qs ? `/explore?${qs}` : "/explore", { scroll: false });
      });
    },
    [router]
  );

  function onChange(patch: Partial<ExploreFiltersState>) {
    const next = { ...filters, ...patch };
    setFilters(next);
    pushFilters(next);
  }

  function onReset() {
    const next: ExploreFiltersState = { sort: "rating" };
    setFilters(next);
    setSearchText("");
    pushFilters(next);
  }

  // Debounced free-text search.
  function onSearchChange(value: string) {
    setSearchText(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      onChange({ q: value.trim() || undefined });
    }, 350);
  }

  // Fetch places inside the viewport on pan/zoom (debounced), then narrow by
  // the active filters client-side (the bounds RPC is filter-agnostic).
  const onBoundsChange = useCallback(
    (b: MapBounds) => {
      if (boundsTimer.current) clearTimeout(boundsTimer.current);
      boundsTimer.current = setTimeout(async () => {
        setBoundsLoading(true);
        try {
          const inBounds = await getPlacesInBounds(b);
          setPlaces(applyFilters(inBounds, filters));
        } catch {
          /* keep the current list on a transient error */
        } finally {
          setBoundsLoading(false);
        }
      }, 400);
    },
    [filters]
  );

  useEffect(
    () => () => {
      clearTimeout(searchTimer.current);
      clearTimeout(boundsTimer.current);
    },
    []
  );

  const loading = pending || boundsLoading;
  const showSkeletons = loading && places.length === 0;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header: search + filters */}
      <div className="shrink-0 space-y-3 border-b bg-background px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search places or a city…"
            aria-label="Search places"
            className="h-10 pl-9"
          />
        </div>
        <ExploreFilters
          filters={filters}
          onChange={onChange}
          onReset={onReset}
          count={places.length}
          loading={loading}
        />
      </div>

      {/* Body: list + map */}
      <div className="relative flex min-h-0 flex-1">
        {/* List */}
        <div
          className={cn(
            "w-full overflow-y-auto p-4 lg:w-2/5",
            mobileView === "map" ? "hidden lg:block" : "block"
          )}
        >
          {showSkeletons ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-[4/3] w-full rounded-xl" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              ))}
            </div>
          ) : places.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
              <p className="text-muted-foreground">
                No places match these filters in this area.
              </p>
              <Button variant="outline" onClick={onReset}>
                <X className="h-4 w-4" />
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {places.map((p) => (
                <div
                  key={p.id}
                  onMouseEnter={() => setActiveId(p.id)}
                  onMouseLeave={() => setActiveId(null)}
                  className={cn(
                    "relative rounded-xl transition-shadow",
                    activeId === p.id && "ring-2 ring-brand ring-offset-2"
                  )}
                >
                  <PlaceCard place={p} initialSaved={savedSet.has(p.id)} />
                  <div className="absolute right-14 top-3 z-10">
                    <AddToTripButton
                      placeId={p.id}
                      placeName={p.name}
                      trips={trips}
                      defaultTripTitle={p.city ?? undefined}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map */}
        <div
          className={cn(
            "w-full lg:w-3/5",
            mobileView === "list" ? "hidden lg:block" : "block"
          )}
        >
          <PlaceMap
            places={places}
            activeId={activeId}
            onActivate={setActiveId}
            onBoundsChange={onBoundsChange}
            fitKey={filterSig}
          />
        </div>

        {/* Mobile list/map toggle */}
        <Button
          type="button"
          onClick={() => setMobileView((v) => (v === "list" ? "map" : "list"))}
          className="absolute bottom-5 left-1/2 z-[1100] -translate-x-1/2 shadow-lg lg:hidden"
        >
          {mobileView === "list" ? (
            <>
              <MapIcon className="h-4 w-4" />
              Map
            </>
          ) : (
            <>
              <List className="h-4 w-4" />
              List
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
