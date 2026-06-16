-- =============================================================================
-- Roamio schema — paste into Supabase SQL Editor and RUN.
-- Prerequisite: enable the postgis AND vector extensions first
--   (Database > Extensions).
-- After running, you should see 10 app tables in the public schema
--   (plus PostGIS's spatial_ref_sys = 11 tables total) and RLS enabled on all 10.
--
-- This script is IDEMPOTENT and safe to re-run.
-- =============================================================================

-- =============================================================================
-- SECTION 1: EXTENSIONS
-- These are defensive no-ops if you already enabled them via the dashboard.
-- =============================================================================
create extension if not exists postgis with schema extensions;
create extension if not exists vector with schema extensions;

-- Ensure the geography(...) and vector(...) types resolve at parse time.
set search_path = public, extensions;

-- =============================================================================
-- SECTION 2: TABLES (all in the public schema)
-- =============================================================================

-- 1. profiles -----------------------------------------------------------------
-- 1:1 with auth.users; auto-populated by the on_auth_user_created trigger.
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  avatar_url    text,
  home_currency text        not null default 'INR',
  preferences   jsonb       not null default '{}'::jsonb,
  tripcoins     int         not null default 0,
  created_at    timestamptz not null default now()
);

-- 2. places -------------------------------------------------------------------
-- Master catalog of points of interest. Public-read, service-role seeded.
create table if not exists public.places (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  category     text not null check (category in (
                 'cafe','restaurant','hotel','monument','attraction',
                 'viewpoint','beach','park','museum','market')),
  city         text,
  state        text,
  country      text,
  location     geography(Point,4326),
  rating       numeric(2,1),
  review_count int  not null default 0,
  price_level  int  check (price_level between 1 and 4),
  opening_hours jsonb,
  is_historic  boolean not null default false,
  cover_image  text,
  images       text[] not null default '{}'::text[],
  external_ids jsonb  not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

-- 3. kb_chunks ----------------------------------------------------------------
-- AI knowledge base for RAG. embedding is a 1536-dim vector (e.g. OpenAI).
create table if not exists public.kb_chunks (
  id         uuid primary key default gen_random_uuid(),
  place_id   uuid references public.places(id) on delete cascade,
  content    text not null,
  source     text,
  embedding  vector(1536),
  verified   boolean not null default false,
  created_at timestamptz not null default now()
);

-- 4. trips --------------------------------------------------------------------
-- A user's trip plan. Optionally shareable via a public slug.
create table if not exists public.trips (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  destination   text,
  start_date    date,
  end_date      date,
  days          int,
  route_geojson jsonb,
  cover_image   text,
  is_public     boolean not null default false,
  share_slug    text unique,
  created_at    timestamptz not null default now()
);

-- 5. trip_items ---------------------------------------------------------------
-- Ordered places within a trip, grouped by day.
create table if not exists public.trip_items (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips(id)  on delete cascade,
  place_id     uuid not null references public.places(id) on delete cascade,
  day_number   int  not null default 1,
  order_index  int  not null default 0,
  arrival_time time,
  notes        text,
  created_at   timestamptz not null default now()
);

-- 6. saved_places -------------------------------------------------------------
-- A user's bookmarked places (wishlist). One row per (user, place).
create table if not exists public.saved_places (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id)  on delete cascade,
  place_id   uuid not null references public.places(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, place_id)
);

-- 7. journal_entries ----------------------------------------------------------
-- Travel journal. Trip/place links are nullable and survive deletion.
create table if not exists public.journal_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  trip_id    uuid references public.trips(id)  on delete set null,
  place_id   uuid references public.places(id) on delete set null,
  body       text,
  rating     int check (rating between 1 and 5),
  photo_urls text[] not null default '{}'::text[],
  visited_at timestamptz,
  created_at timestamptz not null default now()
);

-- 8. festivals ----------------------------------------------------------------
-- Public catalog of festivals/events. Public-read, service-role seeded.
create table if not exists public.festivals (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text,
  location         geography(Point,4326),
  city             text,
  country          text,
  start_date       date,
  end_date         date,
  significance     text,
  partner_discount jsonb,
  created_at       timestamptz not null default now()
);

-- 9. ai_messages --------------------------------------------------------------
-- Chat history for the AI guide. trip_id link is nullable.
create table if not exists public.ai_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  trip_id    uuid references public.trips(id) on delete set null,
  role       text not null check (role in ('user','assistant')),
  content    text not null,
  context    jsonb,
  created_at timestamptz not null default now()
);

-- 10. alerts ------------------------------------------------------------------
-- User notification subscriptions.
create table if not exists public.alerts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null check (type in ('festival','price_drop','best_time')),
  filters    jsonb,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- SECTION 3: INDEXES
-- =============================================================================

-- Spatial (GIST) indexes for geography columns.
create index if not exists places_location_gix
  on public.places using gist (location);
create index if not exists festivals_location_gix
  on public.festivals using gist (location);

-- Common query path: browse by category/city ordered by rating.
create index if not exists places_cat_city_rating_idx
  on public.places (category, city, rating desc);

-- City-only filtering (destination pages, getPlaces by city) — the composite
-- index above leads with category, so a standalone city index is needed.
create index if not exists places_city_idx
  on public.places (city);

-- Upcoming-festivals queries filter/order by start_date.
create index if not exists festivals_start_date_idx
  on public.festivals (start_date);

-- Itinerary ordering within a trip.
create index if not exists trip_items_order_idx
  on public.trip_items (trip_id, day_number, order_index);

-- Vector similarity (cosine) index for RAG retrieval.
create index if not exists kb_chunks_embedding_idx
  on public.kb_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Foreign-key / owner lookup helpers.
create index if not exists trips_user_id_idx
  on public.trips (user_id);
create index if not exists saved_places_user_id_idx
  on public.saved_places (user_id);
create index if not exists journal_entries_user_id_idx
  on public.journal_entries (user_id);
create index if not exists ai_messages_user_id_idx
  on public.ai_messages (user_id);
create index if not exists kb_chunks_place_id_idx
  on public.kb_chunks (place_id);
create index if not exists trip_items_place_id_idx
  on public.trip_items (place_id);

-- =============================================================================
-- SECTION 4: TRIGGER — auto-create a profile row on new auth user
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- SECTION 5: ENABLE ROW LEVEL SECURITY ON ALL 10 TABLES
-- =============================================================================
alter table public.profiles        enable row level security;
alter table public.places          enable row level security;
alter table public.kb_chunks       enable row level security;
alter table public.trips           enable row level security;
alter table public.trip_items      enable row level security;
alter table public.saved_places    enable row level security;
alter table public.journal_entries enable row level security;
alter table public.festivals       enable row level security;
alter table public.ai_messages     enable row level security;
alter table public.alerts          enable row level security;

-- =============================================================================
-- SECTION 6: RLS POLICIES (drop-if-exists then create — rerunnable)
-- =============================================================================

-- --- profiles ----------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to anon, authenticated
  using (true);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
-- (No delete policy: profiles are removed via auth.users cascade.)

-- --- places (public read; writes via service role only) ----------------------
drop policy if exists places_select on public.places;
create policy places_select on public.places
  for select to anon, authenticated
  using (true);

-- --- festivals (public read; writes via service role only) -------------------
drop policy if exists festivals_select on public.festivals;
create policy festivals_select on public.festivals
  for select to anon, authenticated
  using (true);

-- --- kb_chunks (public read; writes via service role only) -------------------
drop policy if exists kb_chunks_select on public.kb_chunks;
create policy kb_chunks_select on public.kb_chunks
  for select to anon, authenticated
  using (true);

-- --- trips -------------------------------------------------------------------
drop policy if exists trips_select on public.trips;
create policy trips_select on public.trips
  for select to anon, authenticated
  using (auth.uid() = user_id or is_public = true);

drop policy if exists trips_insert on public.trips;
create policy trips_insert on public.trips
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists trips_update on public.trips;
create policy trips_update on public.trips
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists trips_delete on public.trips;
create policy trips_delete on public.trips
  for delete to authenticated
  using (auth.uid() = user_id);

-- --- trip_items (reads follow parent trip's visibility) ----------------------
drop policy if exists trip_items_select on public.trip_items;
create policy trip_items_select on public.trip_items
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.trips t
      where t.id = trip_items.trip_id
        and (t.user_id = auth.uid() or t.is_public = true)
    )
  );

drop policy if exists trip_items_insert on public.trip_items;
create policy trip_items_insert on public.trip_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.trips t
      where t.id = trip_items.trip_id
        and t.user_id = auth.uid()
    )
  );

drop policy if exists trip_items_update on public.trip_items;
create policy trip_items_update on public.trip_items
  for update to authenticated
  using (
    exists (
      select 1 from public.trips t
      where t.id = trip_items.trip_id
        and t.user_id = auth.uid()
    )
  );

drop policy if exists trip_items_delete on public.trip_items;
create policy trip_items_delete on public.trip_items
  for delete to authenticated
  using (
    exists (
      select 1 from public.trips t
      where t.id = trip_items.trip_id
        and t.user_id = auth.uid()
    )
  );

-- --- saved_places (owner-only, all actions) ----------------------------------
drop policy if exists saved_places_select on public.saved_places;
create policy saved_places_select on public.saved_places
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists saved_places_insert on public.saved_places;
create policy saved_places_insert on public.saved_places
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists saved_places_update on public.saved_places;
create policy saved_places_update on public.saved_places
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists saved_places_delete on public.saved_places;
create policy saved_places_delete on public.saved_places
  for delete to authenticated
  using (auth.uid() = user_id);

-- --- journal_entries (owner-only, all actions) -------------------------------
drop policy if exists journal_entries_select on public.journal_entries;
create policy journal_entries_select on public.journal_entries
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists journal_entries_insert on public.journal_entries;
create policy journal_entries_insert on public.journal_entries
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists journal_entries_update on public.journal_entries;
create policy journal_entries_update on public.journal_entries
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists journal_entries_delete on public.journal_entries;
create policy journal_entries_delete on public.journal_entries
  for delete to authenticated
  using (auth.uid() = user_id);

-- --- ai_messages (owner-only) ------------------------------------------------
drop policy if exists ai_messages_select on public.ai_messages;
create policy ai_messages_select on public.ai_messages
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists ai_messages_insert on public.ai_messages;
create policy ai_messages_insert on public.ai_messages
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists ai_messages_update on public.ai_messages;
create policy ai_messages_update on public.ai_messages
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists ai_messages_delete on public.ai_messages;
create policy ai_messages_delete on public.ai_messages
  for delete to authenticated
  using (auth.uid() = user_id);

-- --- alerts (owner-only, all actions) ----------------------------------------
drop policy if exists alerts_select on public.alerts;
create policy alerts_select on public.alerts
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists alerts_insert on public.alerts;
create policy alerts_insert on public.alerts
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists alerts_update on public.alerts;
create policy alerts_update on public.alerts
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists alerts_delete on public.alerts;
create policy alerts_delete on public.alerts
  for delete to authenticated
  using (auth.uid() = user_id);

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
