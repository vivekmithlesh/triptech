"use client";

import "leaflet/dist/leaflet.css";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import type { Festival } from "@/types/database";
import { formatDateRange, formatLocation } from "@/lib/utils";

function festivalIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:18px;height:18px;border-radius:9999px;background:#E9C46A;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -9],
  });
}

function FitToFestivals({ festivals }: { festivals: Festival[] }) {
  const map = useMap();
  useEffect(() => {
    const pts = festivals
      .filter((f) => f.location)
      .map((f) => [f.location!.lat, f.location!.lng] as [number, number]);
    if (pts.length === 0) return;
    if (pts.length === 1) map.setView(pts[0], 5);
    else map.fitBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: 6 });
  }, [festivals, map]);
  return null;
}

export default function FestivalMap({ festivals }: { festivals: Festival[] }) {
  const located = useMemo(() => festivals.filter((f) => f.location), [festivals]);

  return (
    <MapContainer
      center={[20.59, 78.96]}
      zoom={3}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToFestivals festivals={located} />
      {located.map((f) => (
        <Marker
          key={f.id}
          position={[f.location!.lat, f.location!.lng]}
          icon={festivalIcon()}
        >
          <Popup>
            <p className="text-xs font-medium text-brand-teal">
              {formatDateRange(f.start_date, f.end_date) || "Dates TBA"}
            </p>
            <p className="text-sm font-semibold">{f.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatLocation(f.city, f.country)}
            </p>
            {f.city && (
              <Link
                href={`/destination/${encodeURIComponent(f.city)}`}
                className="text-xs font-medium text-brand"
              >
                View destination →
              </Link>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
