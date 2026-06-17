"use client";

import dynamic from "next/dynamic";

import type { Place } from "@/types/database";

// Leaflet is browser-only — load the shared map without SSR.
const PlaceMap = dynamic(() => import("@/components/PlaceMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
});

// Reuses the shared PlaceMap for a single place (one marker, no bounds fetch).
export function PlaceLocationMap({ place }: { place: Place }) {
  return <PlaceMap places={[place]} fitKey={place.id} />;
}
