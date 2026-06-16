-- =============================================================================
-- Roamio data-layer SQL — paste into the Supabase SQL Editor and RUN once,
-- AFTER schema.sql + seed_functions.sql and the seed have been applied.
--
-- What this provides (used by src/lib/actions/*):
--   - places_with_coords     : view exposing places with lat/lng + global
--                              save_count (geography can't be read cleanly
--                              through the REST API, so we extract X/Y here).
--   - festivals_with_coords  : same idea for festivals.
--   - places_in_bounds(...)  : PostGIS ST_Within over a map viewport envelope.
--   - places_nearby(...)     : PostGIS ST_DWithin radius search (km), nearest first.
--
-- Security: these expose only public-read data (places + festivals). The
-- save_count aggregate is global and intentionally bypasses saved_places RLS
-- (counts only, never rows). Idempotent: safe to re-run.
-- =============================================================================

set search_path = public, extensions;

-- places_with_coords ----------------------------------------------------------
-- NB: keep this column list in sync with the RPCs below (they "returns setof
-- public.places_with_coords"). save_count drives the trending sort.
create or replace view public.places_with_coords as
select
  p.id,
  p.name,
  p.description,
  p.category,
  p.city,
  p.state,
  p.country,
  ST_Y(p.location::geometry) as lat,
  ST_X(p.location::geometry) as lng,
  p.rating,
  p.review_count,
  p.price_level,
  p.opening_hours,
  p.is_historic,
  p.cover_image,
  p.images,
  p.external_ids,
  p.created_at,
  coalesce(
    (select count(*) from public.saved_places s where s.place_id = p.id),
    0
  )::int as save_count
from public.places p;

grant select on public.places_with_coords to anon, authenticated;

-- festivals_with_coords -------------------------------------------------------
create or replace view public.festivals_with_coords as
select
  f.id,
  f.name,
  f.description,
  ST_Y(f.location::geometry) as lat,
  ST_X(f.location::geometry) as lng,
  f.city,
  f.country,
  f.start_date,
  f.end_date,
  f.significance,
  f.partner_discount,
  f.created_at
from public.festivals f;

grant select on public.festivals_with_coords to anon, authenticated;

-- places_in_bounds ------------------------------------------------------------
-- Returns every place whose point falls inside the [SW, NE] map viewport.
create or replace function public.places_in_bounds(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision
) returns setof public.places_with_coords
language sql
stable
set search_path = public, extensions
as $$
  select pw.*
  from public.places_with_coords pw
  join public.places p on p.id = pw.id
  where p.location is not null
    and ST_Within(
      p.location::geometry,
      ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
    );
$$;

grant execute on function public.places_in_bounds(
  double precision, double precision, double precision, double precision
) to anon, authenticated;

-- places_nearby ---------------------------------------------------------------
-- Returns places within p_km kilometres of (p_lat, p_lng), nearest first.
create or replace function public.places_nearby(
  p_lat double precision,
  p_lng double precision,
  p_km  double precision,
  p_limit int default 60
) returns setof public.places_with_coords
language sql
stable
set search_path = public, extensions
as $$
  select pw.*
  from public.places_with_coords pw
  join public.places p on p.id = pw.id
  where p.location is not null
    and ST_DWithin(
      p.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_km * 1000
    )
  order by ST_Distance(
    p.location,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
  ) asc
  limit p_limit;
$$;

grant execute on function public.places_nearby(
  double precision, double precision, double precision, int
) to anon, authenticated;

-- =============================================================================
-- END
-- =============================================================================
