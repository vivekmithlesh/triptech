-- =============================================================================
-- Roamio seed helper RPCs — paste into the Supabase SQL Editor and RUN once,
-- BEFORE running `npx tsx scripts/seed.ts`.
--
-- Why these exist: places & festivals have a PostGIS `geography(Point,4326)`
-- column that can't be set cleanly through the PostgREST insert API. These
-- RPCs take plain lat/lng and build the point with ST_SetSRID(ST_MakePoint…).
--
-- Security: SECURITY INVOKER (default) so RLS still applies — only the
-- service-role key (which bypasses RLS) can actually insert. EXECUTE is
-- revoked from anon/authenticated so the public API can't call them.
--
-- Idempotent: safe to re-run (create or replace).
-- =============================================================================

set search_path = public, extensions;

-- insert_place ----------------------------------------------------------------
create or replace function public.insert_place(
  p_name         text,
  p_description   text,
  p_category      text,
  p_city          text,
  p_state         text,
  p_country       text,
  p_lat           double precision,
  p_lng           double precision,
  p_rating        numeric,
  p_review_count  int,
  p_price_level   int,
  p_opening_hours jsonb,
  p_is_historic   boolean,
  p_cover_image   text,
  p_images        text[],
  p_external_ids  jsonb
) returns uuid
language plpgsql
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  insert into public.places (
    name, description, category, city, state, country, location,
    rating, review_count, price_level, opening_hours, is_historic,
    cover_image, images, external_ids
  ) values (
    p_name, p_description, p_category, p_city, p_state, p_country,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_rating, coalesce(p_review_count, 0), p_price_level, p_opening_hours,
    coalesce(p_is_historic, false), p_cover_image,
    coalesce(p_images, '{}'::text[]), coalesce(p_external_ids, '{}'::jsonb)
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.insert_place(
  text, text, text, text, text, text, double precision, double precision,
  numeric, int, int, jsonb, boolean, text, text[], jsonb
) from anon, authenticated;

-- insert_festival -------------------------------------------------------------
create or replace function public.insert_festival(
  p_name             text,
  p_description       text,
  p_lat               double precision,
  p_lng               double precision,
  p_city              text,
  p_country           text,
  p_start_date        date,
  p_end_date          date,
  p_significance      text,
  p_partner_discount  jsonb
) returns uuid
language plpgsql
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  insert into public.festivals (
    name, description, location, city, country,
    start_date, end_date, significance, partner_discount
  ) values (
    p_name, p_description,
    case
      when p_lat is null or p_lng is null then null
      else ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    end,
    p_city, p_country, p_start_date, p_end_date, p_significance, p_partner_discount
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.insert_festival(
  text, text, double precision, double precision, text, text,
  date, date, text, jsonb
) from anon, authenticated;

-- =============================================================================
-- END
-- =============================================================================
