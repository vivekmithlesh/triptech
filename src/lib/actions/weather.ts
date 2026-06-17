"use server";

import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mapFestivalRow, type FestivalRow } from "@/lib/mappers";
import type { Festival } from "@/types/database";

export interface CurrentWeather {
  tempC: number;
  feelsLikeC: number;
  main: string;
  description: string;
  humidity: number;
  windKph: number;
}

export interface ForecastDay {
  date: string;
  minC: number;
  maxC: number;
  main: string;
  description: string;
}

export interface DestinationIntel {
  weather: CurrentWeather | null;
  forecast: ForecastDay[];
  bestSeason: string;
  festivals: Festival[];
}

/** Climate-based best-time hint derived from latitude (honest general guide). */
function bestSeasonHint(lat: number): string {
  const abs = Math.abs(lat);
  const south = lat < 0;
  if (abs < 12) return "Good year-round — avoid the peak monsoon weeks.";
  if (abs < 25)
    return south
      ? "April–September (cooler, drier)"
      : "October–March (cooler, drier)";
  return south
    ? "September–November & March–May (mild)"
    : "April–June & September–October (mild)";
}

interface OWCurrent {
  main: { temp: number; feels_like: number; humidity: number };
  wind: { speed: number };
  weather: { main: string; description: string }[];
}
interface OWForecast {
  list: {
    dt_txt: string;
    main: { temp_min: number; temp_max: number };
    weather: { main: string; description: string }[];
  }[];
}

function aggregateForecast(data: OWForecast): ForecastDay[] {
  const today = new Date().toISOString().slice(0, 10);
  const byDate = new Map<
    string,
    { min: number; max: number; noon?: { main: string; description: string } }
  >();
  for (const item of data.list ?? []) {
    const date = item.dt_txt.slice(0, 10);
    if (date === today) continue;
    const entry = byDate.get(date) ?? { min: Infinity, max: -Infinity };
    entry.min = Math.min(entry.min, item.main.temp_min);
    entry.max = Math.max(entry.max, item.main.temp_max);
    if (item.dt_txt.includes("12:00:00")) {
      entry.noon = {
        main: item.weather[0]?.main ?? "",
        description: item.weather[0]?.description ?? "",
      };
    }
    byDate.set(date, entry);
  }
  return Array.from(byDate.entries())
    .slice(0, 5)
    .map(([date, v]) => ({
      date,
      minC: Math.round(v.min),
      maxC: Math.round(v.max),
      main: v.noon?.main ?? "",
      description: v.noon?.description ?? "",
    }));
}

/**
 * Destination intelligence: live OpenWeather current + 5-day forecast (key is
 * server-side only), a best-season hint, and active/upcoming festivals in the
 * city from the DB. Weather degrades to null on missing key / fetch error.
 */
export async function getDestinationIntel(
  city: string,
  lat: number,
  lng: number
): Promise<DestinationIntel> {
  const bestSeason = bestSeasonHint(lat);

  // Active / upcoming festivals in this city.
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: festRows } = await supabase
    .from("festivals_with_coords")
    .select("*")
    .ilike("city", city)
    .gte("end_date", today)
    .order("start_date", { ascending: true });
  const festivals = ((festRows ?? []) as FestivalRow[]).map(mapFestivalRow);

  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return { weather: null, forecast: [], bestSeason, festivals };

  try {
    const base = "https://api.openweathermap.org/data/2.5";
    const opts = { next: { revalidate: 1800 } } as const;
    const [curRes, fcRes] = await Promise.all([
      fetch(`${base}/weather?lat=${lat}&lon=${lng}&units=metric&appid=${key}`, opts),
      fetch(`${base}/forecast?lat=${lat}&lon=${lng}&units=metric&appid=${key}`, opts),
    ]);
    if (!curRes.ok) return { weather: null, forecast: [], bestSeason, festivals };

    const cur = (await curRes.json()) as OWCurrent;
    const weather: CurrentWeather = {
      tempC: Math.round(cur.main.temp),
      feelsLikeC: Math.round(cur.main.feels_like),
      main: cur.weather[0]?.main ?? "",
      description: cur.weather[0]?.description ?? "",
      humidity: cur.main.humidity,
      windKph: Math.round(cur.wind.speed * 3.6),
    };
    const forecast = fcRes.ok
      ? aggregateForecast((await fcRes.json()) as OWForecast)
      : [];
    return { weather, forecast, bestSeason, festivals };
  } catch {
    return { weather: null, forecast: [], bestSeason, festivals };
  }
}

/**
 * Upcoming festivals that match the cities the current user has saved places in
 * (or created alerts for). Powers the dashboard alert banner. [] when signed out.
 */
export async function getFestivalAlertsForUser(): Promise<Festival[]> {
  const user = await getUser();
  if (!user) return [];
  const supabase = createClient();

  const [{ data: savedRows }, { data: alertRows }] = await Promise.all([
    supabase.from("saved_places").select("place_id").eq("user_id", user.id),
    supabase.from("alerts").select("filters, type").eq("user_id", user.id),
  ]);

  const cities = new Set<string>();
  const savedIds = ((savedRows ?? []) as { place_id: string }[]).map(
    (r) => r.place_id
  );
  if (savedIds.length > 0) {
    const { data: placeRows } = await supabase
      .from("places_with_coords")
      .select("city")
      .in("id", savedIds);
    for (const r of (placeRows ?? []) as { city: string | null }[]) {
      if (r.city) cities.add(r.city.toLowerCase());
    }
  }
  for (const a of (alertRows ?? []) as {
    filters: { destination?: string } | null;
    type: string;
  }[]) {
    const dest = a.filters?.destination;
    if (dest) cities.add(dest.toLowerCase());
  }
  if (cities.size === 0) return [];

  const today = new Date().toISOString().slice(0, 10);
  const { data: festRows } = await supabase
    .from("festivals_with_coords")
    .select("*")
    .gte("end_date", today)
    .order("start_date", { ascending: true });

  return ((festRows ?? []) as FestivalRow[])
    .map(mapFestivalRow)
    .filter((f) => f.city && cities.has(f.city.toLowerCase()))
    .slice(0, 5);
}
