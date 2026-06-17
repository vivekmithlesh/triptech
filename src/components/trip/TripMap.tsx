"use client";

import "leaflet/dist/leaflet.css";

import { Fragment, useEffect, useMemo } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import type { TripItem } from "@/types/database";

// Distinct colour per day; wraps for very long trips.
export const DAY_COLORS = [
  "#0F9E75",
  "#378ADD",
  "#E9A23B",
  "#D9534F",
  "#7A5CC0",
  "#0F6E56",
  "#C07A2B",
  "#2BB3C0",
];

export function dayColor(day: number): string {
  return DAY_COLORS[(day - 1) % DAY_COLORS.length];
}

function numberIcon(n: number, color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;background:${color};color:#fff;font-size:12px;font-weight:600;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">${n}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
}

function FitToItems({ items, fitKey }: { items: TripItem[]; fitKey: string }) {
  const map = useMap();
  useEffect(() => {
    const pts = items
      .filter((i) => i.place?.location)
      .map(
        (i) => [i.place!.location!.lat, i.place!.location!.lng] as [number, number]
      );
    if (pts.length === 0) return;
    if (pts.length === 1) map.setView(pts[0], 13);
    else map.fitBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);
  return null;
}

export interface TripMapProps {
  items: TripItem[];
  /** OSRM/straight polylines per day number, as [lat,lng] pairs. */
  routes?: Record<number, [number, number][]>;
}

export default function TripMap({ items, routes = {} }: TripMapProps) {
  const located = useMemo(() => items.filter((i) => i.place?.location), [items]);

  // Group items by day, ordered, for per-day numbering + straight-line fallback.
  const byDay = useMemo(() => {
    const map = new Map<number, TripItem[]>();
    for (const it of located) {
      const arr = map.get(it.day_number) ?? [];
      arr.push(it);
      map.set(it.day_number, arr);
    }
    map.forEach((arr) => arr.sort((a, b) => a.order_index - b.order_index));
    return map;
  }, [located]);

  const fitKey = located.map((i) => i.id).join(",");

  return (
    <MapContainer
      center={[20.59, 78.96]}
      zoom={4}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToItems items={located} fitKey={fitKey} />

      {Array.from(byDay.entries()).map(([day, dayItems]) => {
        const color = dayColor(day);
        const line =
          routes[day] ??
          dayItems.map(
            (i) =>
              [i.place!.location!.lat, i.place!.location!.lng] as [
                number,
                number,
              ]
          );
        return (
          <Fragment key={day}>
            {line.length >= 2 && (
              <Polyline
                positions={line}
                pathOptions={{ color, weight: 4, opacity: 0.8 }}
              />
            )}
            {dayItems.map((it, i) => (
              <Marker
                key={it.id}
                position={[it.place!.location!.lat, it.place!.location!.lng]}
                icon={numberIcon(i + 1, color)}
              >
                <Popup>
                  <p className="text-xs font-medium" style={{ color }}>
                    Day {day} · Stop {i + 1}
                  </p>
                  <p className="text-sm font-semibold">{it.place!.name}</p>
                </Popup>
              </Marker>
            ))}
          </Fragment>
        );
      })}
    </MapContainer>
  );
}
