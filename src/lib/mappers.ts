// Row → domain mappers shared by the action modules. Kept out of the
// "use server" files because these are plain (non-async) helpers.
import type { Festival, Place, PlaceCategory } from "@/types/database";

// Shape returned by places_with_coords + places_in_bounds/nearby RPCs.
export interface PlaceRow {
  id: string;
  name: string;
  description: string | null;
  category: PlaceCategory;
  city: string | null;
  state: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  review_count: number;
  price_level: number | null;
  opening_hours: Record<string, unknown> | null;
  is_historic: boolean;
  cover_image: string | null;
  images: string[] | null;
  external_ids: Record<string, unknown> | null;
  created_at: string;
  save_count?: number;
}

export function mapPlaceRow(r: PlaceRow): Place {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    category: r.category,
    city: r.city,
    state: r.state,
    country: r.country,
    location:
      r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng } : null,
    rating: r.rating,
    review_count: r.review_count,
    price_level: r.price_level,
    opening_hours: r.opening_hours,
    is_historic: r.is_historic,
    cover_image: r.cover_image,
    images: r.images ?? [],
    external_ids: r.external_ids ?? {},
    created_at: r.created_at,
  };
}

// Shape returned by the festivals_with_coords view.
export interface FestivalRow {
  id: string;
  name: string;
  description: string | null;
  lat: number | null;
  lng: number | null;
  city: string | null;
  country: string | null;
  start_date: string | null;
  end_date: string | null;
  significance: string | null;
  partner_discount: Record<string, unknown> | null;
  created_at: string;
}

export function mapFestivalRow(r: FestivalRow): Festival {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    location:
      r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng } : null,
    city: r.city,
    country: r.country,
    start_date: r.start_date,
    end_date: r.end_date,
    significance: r.significance,
    partner_discount: r.partner_discount,
    created_at: r.created_at,
  };
}
