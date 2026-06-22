-- =============================================================================
-- Migration 0002 — Protect privileged profile columns
-- IDEMPOTENT: safe to re-run.
--
-- Problem: profiles_update RLS lets a user update their OWN row, but with no
-- column restriction a malicious client could call
--   supabase.from('profiles').update({ tripcoins: 999999 })
-- This is harmless today (tripcoins is cosmetic) but becomes a privilege-
-- escalation bug the moment TripCoins / role / plan / subscription columns
-- carry value.
--
-- Defence in depth:
--   (A) Column-level GRANTs  — clients may only INSERT/UPDATE non-privileged
--       columns. New columns added later are NOT auto-granted, so future
--       privileged columns (role, plan, subscription_status, is_admin, ...)
--       are protected by default.
--   (B) Guard trigger        — forcibly reverts privileged columns for the
--       `authenticated`/`anon` roles even if a future `GRANT ALL` widens (A).
-- The service_role key (server-side) and direct DB owner keep full access.
-- =============================================================================

-- (A) Column-level privileges -------------------------------------------------
revoke insert, update on public.profiles from anon, authenticated;

-- A new user row is created by the handle_new_user() SECURITY DEFINER trigger,
-- so clients rarely insert; we still grant the safe columns to satisfy the
-- profiles_insert RLS policy without exposing tripcoins.
grant insert (id, full_name, avatar_url, home_currency, preferences)
  on public.profiles to authenticated;

grant update (full_name, avatar_url, home_currency, preferences)
  on public.profiles to authenticated;

-- (B) Guard trigger (SECURITY INVOKER so current_user reflects the real caller)
create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
as $$
begin
  -- Only constrain the PostgREST client roles; postgres / service_role pass through.
  if current_user in ('authenticated', 'anon') then
    new.tripcoins := old.tripcoins;
    -- Add future privileged columns here, e.g.:
    -- new.role := old.role;
    -- new.plan := old.plan;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_privileged on public.profiles;
create trigger profiles_guard_privileged
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_columns();

-- =============================================================================
-- END 0002
-- =============================================================================
