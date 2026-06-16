// Hand-written domain types mirroring supabase/schema.sql.
// uuid/date/time/timestamptz ISO values are typed as `string`.
// int/numeric are `number`; jsonb is `Record<string, unknown>`.
// Nullable columns are unioned with `| null`.

// --- Enum / union types ------------------------------------------------------
export type PlaceCategory =
  | "cafe"
  | "restaurant"
  | "hotel"
  | "monument"
  | "attraction"
  | "viewpoint"
  | "beach"
  | "park"
  | "museum"
  | "market";

export type AlertType = "festival" | "price_drop" | "best_time";

export type AiRole = "user" | "assistant";

// --- Shared shapes -----------------------------------------------------------
export interface LatLng {
  lat: number;
  lng: number;
}

// --- Table interfaces --------------------------------------------------------

// profiles
export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  home_currency: string;
  preferences: Record<string, unknown>;
  tripcoins: number;
  created_at: string;
}

// places — `location` is exposed as LatLng even though the DB stores geography.
export interface Place {
  id: string;
  name: string;
  description: string | null;
  category: PlaceCategory;
  city: string | null;
  state: string | null;
  country: string | null;
  location: LatLng | null;
  rating: number | null;
  review_count: number;
  price_level: number | null;
  opening_hours: Record<string, unknown> | null;
  is_historic: boolean;
  cover_image: string | null;
  images: string[];
  external_ids: Record<string, unknown>;
  created_at: string;
}

// kb_chunks — the raw embedding vector is intentionally omitted (not used client-side).
export interface KbChunk {
  id: string;
  place_id: string | null;
  content: string;
  source: string | null;
  verified: boolean;
  created_at: string;
}

// trips
export interface Trip {
  id: string;
  user_id: string;
  title: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  days: number | null;
  route_geojson: Record<string, unknown> | null;
  cover_image: string | null;
  is_public: boolean;
  share_slug: string | null;
  created_at: string;
}

// trip_items
export interface TripItem {
  id: string;
  trip_id: string;
  place_id: string;
  day_number: number;
  order_index: number;
  arrival_time: string | null;
  notes: string | null;
  created_at: string;
  // Populated by joined queries.
  place?: Place;
}

// saved_places
export interface SavedPlace {
  id: string;
  user_id: string;
  place_id: string;
  created_at: string;
  // Populated by joined queries.
  place?: Place;
}

// journal_entries
export interface JournalEntry {
  id: string;
  user_id: string;
  trip_id: string | null;
  place_id: string | null;
  body: string | null;
  rating: number | null;
  photo_urls: string[];
  visited_at: string | null;
  created_at: string;
}

// festivals — `location` exposed as LatLng even though the DB stores geography.
export interface Festival {
  id: string;
  name: string;
  description: string | null;
  location: LatLng | null;
  city: string | null;
  country: string | null;
  start_date: string | null;
  end_date: string | null;
  significance: string | null;
  partner_discount: Record<string, unknown> | null;
  created_at: string;
}

// ai_messages
export interface AiMessage {
  id: string;
  user_id: string;
  trip_id: string | null;
  role: AiRole;
  content: string;
  context: Record<string, unknown> | null;
  created_at: string;
}

// alerts
export interface Alert {
  id: string;
  user_id: string;
  type: AlertType;
  filters: Record<string, unknown> | null;
  created_at: string;
}

// --- Data-layer helper types -------------------------------------------------

// Filters accepted by getPlaces() (see src/lib/actions/places.ts).
export interface PlaceFilters {
  category?: PlaceCategory;
  city?: string;
  /** Minimum rating (inclusive). */
  minRating?: number;
  /** Maximum price_level (inclusive, 1–4). */
  maxPrice?: number;
  /** When true, only places flagged is_historic. */
  historicOnly?: boolean;
  /** Case-insensitive match against the place name. */
  search?: string;
  limit?: number;
  sort?: "rating" | "reviews" | "name";
}

// A map viewport: south-west + north-east corners.
export interface MapBounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

// A trip with its ordered items (each item's place populated).
export interface TripWithItems extends Trip {
  items: TripItem[];
}
