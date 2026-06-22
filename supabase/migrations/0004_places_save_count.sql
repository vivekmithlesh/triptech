-- =============================================================================
-- Migration 0004 — Denormalise places.save_count (kill the correlated subquery)
-- IDEMPOTENT: safe to re-run.
--
-- Before: public.places_with_coords computed save_count with a correlated
-- subquery `(select count(*) from saved_places where place_id = p.id)` for
-- EVERY row, on every read of the view — i.e. on the home page, explore,
-- map bounds, nearby RPC, saved list, and trip loads. O(places * saved_places).
--
-- After: a maintained integer column on places, kept in sync by triggers on
-- saved_places. The view reads the column directly (O(places)).
-- =============================================================================

set search_path = public, extensions;

-- 1. Column ------------------------------------------------------------------
alter table public.places
  add column if not exists save_count int not null default 0;

-- 2. Maintenance trigger (SECURITY DEFINER: a normal user toggling a save must
--    be able to bump the counter even though places has no UPDATE RLS policy).
create or replace function public.bump_place_save_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.places set save_count = save_count + 1 where id = new.place_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.places
      set save_count = greatest(save_count - 1, 0) where id = old.place_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists saved_places_count_ins on public.saved_places;
create trigger saved_places_count_ins
  after insert on public.saved_places
  for each row execute function public.bump_place_save_count();

drop trigger if exists saved_places_count_del on public.saved_places;
create trigger saved_places_count_del
  after delete on public.saved_places
  for each row execute function public.bump_place_save_count();

-- 3. Backfill existing counts (idempotent: recomputes from the source of truth)
update public.places p
  set save_count = coalesce(c.cnt, 0)
  from (
    select place_id, count(*)::int as cnt
    from public.saved_places group by place_id
  ) c
  where c.place_id = p.id;

update public.places p
  set save_count = 0
  where not exists (
    select 1 from public.saved_places s where s.place_id = p.id
  ) and save_count <> 0;

-- 4. Point the view at the column (same output shape, so dependent RPCs that
--    `returns setof public.places_with_coords` keep working unchanged).
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
  p.save_count
from public.places p;

grant select on public.places_with_coords to anon, authenticated;

-- =============================================================================
-- END 0004
-- =============================================================================
