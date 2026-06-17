"use client";

import dynamic from "next/dynamic";

import type { TripItem } from "@/types/database";

const TripMap = dynamic(() => import("@/components/trip/TripMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
});

export function MiniTripMap({ items }: { items: TripItem[] }) {
  return <TripMap items={items} />;
}
