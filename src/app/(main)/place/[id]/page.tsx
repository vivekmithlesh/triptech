import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Clock, MapPin, Sparkles, Star } from "lucide-react";

import {
  getPlaceById,
  getPlacesByCategory,
  getPlacesNearby,
} from "@/lib/actions/places";
import { getPlaceHistory } from "@/lib/actions/kb";
import { getMyTrips } from "@/lib/actions/trips";
import { getSavedPlaceIds } from "@/lib/actions/saved";
import { getUser } from "@/lib/auth";
import {
  formatLocation,
  formatOpeningHours,
  formatRating,
  getCategoryIcon,
  getCategoryLabel,
  priceLevel,
} from "@/lib/utils";
import type { Place } from "@/types/database";
import { PlaceCard } from "@/components/PlaceCard";
import { SavePlaceButton } from "@/components/SavePlaceButton";
import { ShareButton } from "@/components/ShareButton";
import { AddToTripButton } from "@/components/explore/AddToTripButton";
import { PlaceGallery } from "@/components/place/PlaceGallery";
import { PlaceLocationMap } from "@/components/place/PlaceLocationMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const place = await getPlaceById(params.id).catch(() => null);
  if (!place) return { title: "Place not found" };
  const where = formatLocation(place.city, place.country);
  return {
    title: place.name,
    description:
      place.description ??
      `Discover ${place.name}${where ? ` in ${where}` : ""} on Roamio.`,
    openGraph: {
      title: place.name,
      description: place.description ?? undefined,
      images: place.cover_image ? [{ url: place.cover_image }] : undefined,
    },
  };
}

function dedupeImages(place: Place): string[] {
  return Array.from(
    new Set([place.cover_image, ...place.images].filter(Boolean) as string[])
  );
}

export default async function PlaceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const place = await getPlaceById(params.id);
  if (!place) notFound();

  const user = await getUser();
  const [history, nearbyRaw, similarRaw, savedIds, trips] = await Promise.all([
    getPlaceHistory(place.id).catch(() => []),
    place.location
      ? getPlacesNearby(place.location.lat, place.location.lng, 15, 9).catch(
          () => []
        )
      : Promise.resolve([]),
    getPlacesByCategory(place.category, 9).catch(() => []),
    user ? getSavedPlaceIds().catch(() => []) : Promise.resolve([]),
    user ? getMyTrips().catch(() => []) : Promise.resolve(null),
  ]);

  const savedSet = new Set(savedIds);
  const nearby = nearbyRaw.filter((p) => p.id !== place.id).slice(0, 4);
  const similar = similarRaw.filter((p) => p.id !== place.id).slice(0, 4);
  const images = dedupeImages(place);
  const hours = formatOpeningHours(place.opening_hours);
  const address = [place.city, place.state, place.country]
    .filter(Boolean)
    .join(", ");
  const price = priceLevel(place.price_level);
  const CategoryIcon = getCategoryIcon(place.category);

  return (
    <div className="container-page py-6 pb-24 lg:pb-10">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
      >
        <Link href="/" className="hover:text-brand">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/explore" className="hover:text-brand">
          Explore
        </Link>
        {place.city && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link
              href={`/explore?q=${encodeURIComponent(place.city)}`}
              className="hover:text-brand"
            >
              {place.city}
            </Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="truncate text-foreground">{place.name}</span>
      </nav>

      <PlaceGallery images={images} name={place.name} />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_340px]">
        {/* LEFT — content */}
        <div className="min-w-0 space-y-8">
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="gap-1 bg-brand-light text-brand-teal hover:bg-brand-light">
                <CategoryIcon className="h-3.5 w-3.5" />
                {getCategoryLabel(place.category)}
              </Badge>
              {place.is_historic && (
                <Badge className="bg-brand-deep text-white hover:bg-brand-deep">
                  Historic
                </Badge>
              )}
            </div>

            <h1 className="text-3xl font-semibold sm:text-4xl">{place.name}</h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {address && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {address}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-brand-sand text-brand-sand" />
                <span className="font-medium text-foreground">
                  {formatRating(place.rating)}
                </span>
                {place.review_count > 0 && <>({place.review_count} reviews)</>}
              </span>
              {price && <span className="font-medium">{price}</span>}
            </div>
          </header>

          {place.description && (
            <section className="space-y-2">
              <h2 className="text-xl font-semibold">About</h2>
              <p className="leading-relaxed text-foreground/90">
                {place.description}
              </p>
            </section>
          )}

          {hours.length > 0 && (
            <section className="space-y-2">
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <Clock className="h-5 w-5 text-brand" />
                Opening hours
              </h2>
              <dl className="divide-y rounded-xl border">
                {hours.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between px-4 py-2.5 text-sm"
                  >
                    <dt className="font-medium">{row.label}</dt>
                    <dd className="text-muted-foreground">{row.hours}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {history.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">History &amp; significance</h2>
              <div className="space-y-4">
                {history.map((chunk) => (
                  <div key={chunk.id} className="space-y-1">
                    <p className="leading-relaxed text-foreground/90">
                      {chunk.content}
                    </p>
                    {chunk.source && (
                      <p className="text-xs text-muted-foreground">
                        Source: {chunk.source}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {place.location && (
            <section className="space-y-2">
              <h2 className="text-xl font-semibold">Location</h2>
              <div className="h-72 w-full overflow-hidden rounded-2xl border">
                <PlaceLocationMap place={place} />
              </div>
            </section>
          )}

          {nearby.length > 0 && (
            <PlaceRow title="Nearby places" places={nearby} savedSet={savedSet} />
          )}
          {similar.length > 0 && (
            <PlaceRow
              title={`More ${getCategoryLabel(place.category).toLowerCase()}s`}
              places={similar}
              savedSet={savedSet}
            />
          )}
        </div>

        {/* RIGHT — sticky actions */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            <div className="space-y-3 rounded-2xl border bg-card p-5 shadow-sm">
              <AddToTripButton
                placeId={place.id}
                placeName={place.name}
                trips={trips}
                defaultTripTitle={place.city ?? undefined}
                full
              />
              <Button asChild variant="outline" className="w-full">
                <Link href={`/assistant?placeId=${place.id}`}>
                  <Sparkles className="h-4 w-4 text-brand" />
                  Ask the AI guide
                </Link>
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <SavePlaceButton
                  placeId={place.id}
                  placeName={place.name}
                  initialSaved={savedSet.has(place.id)}
                  className="w-full"
                />
                <ShareButton
                  title={place.name}
                  text={place.description ?? undefined}
                  className="w-full"
                />
              </div>
            </div>

            {place.city && (
              <Link
                href={`/destination/${encodeURIComponent(place.city)}`}
                className="block rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <p className="section-eyebrow">Plan around this</p>
                <p className="mt-1 font-semibold">Best time to visit {place.city}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Weather, best season &amp; active festivals →
                </p>
              </Link>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t bg-background/95 p-3 backdrop-blur lg:hidden">
        <SavePlaceButton
          placeId={place.id}
          placeName={place.name}
          initialSaved={savedSet.has(place.id)}
          className="flex-1"
        />
        <div className="flex-1">
          <AddToTripButton
            placeId={place.id}
            placeName={place.name}
            trips={trips}
            defaultTripTitle={place.city ?? undefined}
            full
          />
        </div>
      </div>
    </div>
  );
}

function PlaceRow({
  title,
  places,
  savedSet,
}: {
  title: string;
  places: Place[];
  savedSet: Set<string>;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {places.map((p) => (
          <PlaceCard key={p.id} place={p} initialSaved={savedSet.has(p.id)} />
        ))}
      </div>
    </section>
  );
}
