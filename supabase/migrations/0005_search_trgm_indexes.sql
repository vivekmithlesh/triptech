-- =============================================================================
-- Migration 0005 — Trigram indexes for ILIKE search
-- IDEMPOTENT: safe to re-run.
--
-- getPlaces() filters with `name ILIKE '%term%'` and `name/city ILIKE` via .or()
-- (src/lib/actions/places.ts). A leading-wildcard ILIKE cannot use a btree
-- index, so it degrades to a sequential scan as the catalog grows. pg_trgm GIN
-- indexes make these index-supported WITHOUT changing query behaviour/results.
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;

set search_path = public, extensions;

create index if not exists places_name_trgm
  on public.places using gin (name extensions.gin_trgm_ops);

create index if not exists places_city_trgm
  on public.places using gin (city extensions.gin_trgm_ops);

-- Festivals are filtered by city ILIKE in getDestinationIntel().
create index if not exists festivals_city_trgm
  on public.festivals using gin (city extensions.gin_trgm_ops);

-- =============================================================================
-- END 0005
-- =============================================================================
