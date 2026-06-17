import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

// Revalidate hourly so newly-public trips + destinations get indexed.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/explore",
    "/festivals",
    "/assistant",
    "/auth",
  ].map((p) => ({ url: `${base}${p}`, lastModified: now }));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !url.startsWith("http")) return staticRoutes;

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const [{ data: trips }, { data: places }] = await Promise.all([
      supabase
        .from("trips")
        .select("share_slug, created_at")
        .eq("is_public", true)
        .not("share_slug", "is", null),
      supabase.from("places_with_coords").select("city"),
    ]);

    const cities = Array.from(
      new Set(
        ((places ?? []) as { city: string | null }[])
          .map((p) => p.city)
          .filter((c): c is string => !!c)
      )
    );
    const cityRoutes: MetadataRoute.Sitemap = cities.map((c) => ({
      url: `${base}/destination/${encodeURIComponent(c)}`,
      lastModified: now,
    }));

    const tripRoutes: MetadataRoute.Sitemap = (
      (trips ?? []) as { share_slug: string; created_at: string }[]
    ).map((t) => ({
      url: `${base}/t/${t.share_slug}`,
      lastModified: new Date(t.created_at),
    }));

    return [...staticRoutes, ...cityRoutes, ...tripRoutes];
  } catch {
    return staticRoutes;
  }
}
