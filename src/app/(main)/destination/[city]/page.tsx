import type { Metadata } from "next";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  Calendar,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Droplets,
  type LucideIcon,
  ShieldCheck,
  Sun,
  Wind,
} from "lucide-react";

import { getPlaces } from "@/lib/actions/places";
import { getFestivals } from "@/lib/actions/festivals";
import { getSavedPlaceIds } from "@/lib/actions/saved";
import { getDestinationIntel } from "@/lib/actions/weather";
import { getUser } from "@/lib/auth";
import { formatDateRange } from "@/lib/utils";
import { PlaceCard } from "@/components/PlaceCard";
import { PlanTripButton } from "@/components/PlanTripButton";

export async function generateMetadata({
  params,
}: {
  params: { city: string };
}): Promise<Metadata> {
  const city = decodeURIComponent(params.city);
  return {
    title: city,
    description: `Weather, best time to visit, festivals and top places in ${city} — plan your trip with Roamio.`,
  };
}

function weatherIcon(main: string): LucideIcon {
  switch (main) {
    case "Clear":
      return Sun;
    case "Clouds":
      return Cloud;
    case "Rain":
    case "Drizzle":
      return CloudRain;
    case "Thunderstorm":
      return CloudLightning;
    case "Snow":
      return CloudSnow;
    default:
      return CloudFog;
  }
}

export default async function DestinationPage({
  params,
}: {
  params: { city: string };
}) {
  const city = decodeURIComponent(params.city);
  const user = await getUser();

  const [places, allFestivals, savedIds] = await Promise.all([
    getPlaces({ city, limit: 8 }).catch(() => []),
    getFestivals().catch(() => []),
    user ? getSavedPlaceIds().catch(() => []) : Promise.resolve([]),
  ]);

  const cityFestivals = allFestivals.filter(
    (f) => f.city && f.city.toLowerCase() === city.toLowerCase()
  );
  const coords =
    places.find((p) => p.location)?.location ??
    cityFestivals.find((f) => f.location)?.location ??
    null;

  const intel = coords
    ? await getDestinationIntel(city, coords.lat, coords.lng)
    : null;

  const festivals = intel?.festivals ?? cityFestivals;
  const savedSet = new Set(savedIds);
  const CurrentIcon = intel?.weather
    ? weatherIcon(intel.weather.main)
    : Cloud;

  return (
    <div className="container-page space-y-8 py-8">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-eyebrow">Destination</p>
          <h1 className="text-3xl font-semibold">{city}</h1>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Generally safe
          </span>
        </div>
        <PlanTripButton
          title={`Trip to ${city}`}
          destination={city}
          loggedIn={!!user}
          label={`Plan a trip to ${city}`}
        />
      </header>

      {/* Weather + best time */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5 lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold">Weather</h2>
          {intel?.weather ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <CurrentIcon className="h-12 w-12 text-brand" />
                <div>
                  <p className="text-3xl font-semibold">
                    {intel.weather.tempC}°C
                  </p>
                  <p className="text-sm capitalize text-muted-foreground">
                    {intel.weather.description} · feels {intel.weather.feelsLikeC}°C
                  </p>
                </div>
                <div className="ml-auto space-y-1 text-sm text-muted-foreground">
                  <p className="flex items-center justify-end gap-1">
                    <Droplets className="h-4 w-4" /> {intel.weather.humidity}%
                  </p>
                  <p className="flex items-center justify-end gap-1">
                    <Wind className="h-4 w-4" /> {intel.weather.windKph} km/h
                  </p>
                </div>
              </div>

              {intel.forecast.length > 0 && (
                <div className="grid grid-cols-5 gap-2 border-t pt-4">
                  {intel.forecast.map((d) => {
                    const Icon = weatherIcon(d.main);
                    return (
                      <div key={d.date} className="text-center">
                        <p className="text-xs font-medium text-muted-foreground">
                          {format(parseISO(d.date), "EEE")}
                        </p>
                        <Icon className="mx-auto my-1 h-5 w-5 text-brand" />
                        <p className="text-sm">
                          <span className="font-medium">{d.maxC}°</span>{" "}
                          <span className="text-muted-foreground">{d.minC}°</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Live weather isn&apos;t available for this destination right now.
            </p>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <h2 className="mb-2 text-lg font-semibold">Best time to visit</h2>
          <p className="text-2xl font-semibold text-brand-teal">
            {intel?.bestSeason || "Year-round"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            A general climate guide — check the forecast for current conditions.
          </p>
        </div>
      </section>

      {/* Festivals */}
      {festivals.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Festivals here</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {festivals.map((f) => (
              <Link
                key={f.id}
                href="/festivals"
                className="flex flex-col gap-1 rounded-xl border bg-card p-4 transition-shadow hover:shadow-md"
              >
                <span className="flex items-center gap-1.5 text-sm text-brand">
                  <Calendar className="h-4 w-4" />
                  {formatDateRange(f.start_date, f.end_date) || "Dates TBA"}
                </span>
                <span className="font-semibold">{f.name}</span>
                {f.significance && (
                  <span className="line-clamp-2 text-sm text-muted-foreground">
                    {f.significance}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Top places */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Top places in {city}</h2>
          <Link
            href={`/explore?q=${encodeURIComponent(city)}`}
            className="text-sm font-medium text-brand"
          >
            See all on the map →
          </Link>
        </div>
        {places.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {places.map((p) => (
              <PlaceCard key={p.id} place={p} initialSaved={savedSet.has(p.id)} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            No places catalogued in {city} yet.
          </p>
        )}
      </section>
    </div>
  );
}
