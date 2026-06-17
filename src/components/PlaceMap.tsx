"use client";

import "leaflet/dist/leaflet.css";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { Star } from "lucide-react";

import type { MapBounds, Place, PlaceCategory } from "@/types/database";
import { formatLocation, formatRating, getCategoryLabel } from "@/lib/utils";

// Distinct marker colour per category (brand-leaning palette).
const CATEGORY_COLOR: Record<PlaceCategory, string> = {
  monument: "#0F6E56",
  attraction: "#0F9E75",
  viewpoint: "#5DCAA5",
  beach: "#378ADD",
  museum: "#13343B",
  park: "#3E8E41",
  cafe: "#C07A2B",
  restaurant: "#D9534F",
  hotel: "#7A5CC0",
  market: "#E9A23B",
};

function pinIcon(category: PlaceCategory, active: boolean): L.DivIcon {
  const color = CATEGORY_COLOR[category] ?? "#0F9E75";
  const size = active ? 24 : 16;
  const ring = active ? "0 0 0 4px rgba(15,158,117,.35)," : "";
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:${ring}0 1px 4px rgba(0,0,0,.4)"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

// Reports the viewport to the parent whenever the user pans/zooms.
function BoundsWatcher({
  onBoundsChange,
}: {
  onBoundsChange?: (b: MapBounds) => void;
}) {
  useMapEvents({
    moveend: (e) => {
      if (!onBoundsChange) return;
      const b = e.target.getBounds();
      onBoundsChange({
        minLng: b.getWest(),
        minLat: b.getSouth(),
        maxLng: b.getEast(),
        maxLat: b.getNorth(),
      });
    },
  });
  return null;
}

// Fits the map to the current places, but only when `fitKey` changes
// (i.e. on a filter change) — never on plain pans, so there's no feedback loop.
function FitToPlaces({ places, fitKey }: { places: Place[]; fitKey: string }) {
  const map = useMap();
  useEffect(() => {
    const pts = places
      .filter((p) => p.location)
      .map((p) => [p.location!.lat, p.location!.lng] as [number, number]);
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.setView(pts[0], 12);
    } else {
      map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 13 });
    }
    // Intentionally only re-fit when the filter signature changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);
  return null;
}

export interface PlaceMapProps {
  places: Place[];
  /** The currently highlighted place id (synced with the list on hover). */
  activeId?: string | null;
  onActivate?: (id: string | null) => void;
  onBoundsChange?: (b: MapBounds) => void;
  /** Changing this string re-fits the map to `places` (used on filter change). */
  fitKey?: string;
  className?: string;
}

export default function PlaceMap({
  places,
  activeId,
  onActivate,
  onBoundsChange,
  fitKey = "",
  className,
}: PlaceMapProps) {
  const located = useMemo(() => places.filter((p) => p.location), [places]);

  // Default view: India-centric, zoomed out — FitToPlaces refines it.
  return (
    <MapContainer
      center={[20.59, 78.96]}
      zoom={4}
      scrollWheelZoom
      className={className}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <BoundsWatcher onBoundsChange={onBoundsChange} />
      <FitToPlaces places={located} fitKey={fitKey} />

      {located.map((p) => (
        <Marker
          key={p.id}
          position={[p.location!.lat, p.location!.lng]}
          icon={pinIcon(p.category, p.id === activeId)}
          zIndexOffset={p.id === activeId ? 1000 : 0}
          eventHandlers={{
            mouseover: () => onActivate?.(p.id),
            mouseout: () => onActivate?.(null),
          }}
        >
          <Popup>
            <Link
              href={`/place/${p.id}`}
              className="block w-44 no-underline text-foreground"
            >
              <div className="relative mb-1.5 h-24 w-full overflow-hidden rounded-md bg-muted">
                {p.cover_image ? (
                  <Image
                    src={p.cover_image}
                    alt={p.name}
                    fill
                    sizes="176px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <p className="text-xs font-medium text-brand">
                {getCategoryLabel(p.category)}
              </p>
              <p className="text-sm font-semibold leading-tight">{p.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatLocation(p.city, p.country)}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs">
                <Star className="h-3 w-3 fill-brand-sand text-brand-sand" />
                {formatRating(p.rating)}
              </p>
            </Link>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
