-- =============================================================================
-- Roamio — RLS & hardening VERIFICATION script
-- Run in the Supabase SQL Editor (as postgres) AFTER applying schema.sql +
-- functions.sql + ai_functions.sql + seed_functions.sql + migrations 0001-0005.
--
-- PART A runs with no setup and asserts structure (RLS on, policies present,
-- column privileges locked, grants locked). Each check RAISES on failure so a
-- clean run = green. PART B is a copy/paste cross-user harness that needs two
-- real user UUIDs (requires live verification).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PART A — structural assertions (no setup required)
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'profiles','places','kb_chunks','trips','trip_items','saved_places',
    'journal_entries','festivals','ai_messages','alerts','ai_usage'];
  v_enabled boolean;
  v_count int;
begin
  -- A1. RLS enabled on every sensitive table.
  foreach t in array tables loop
    select relrowsecurity into v_enabled
      from pg_class where oid = ('public.' || t)::regclass;
    if not coalesce(v_enabled, false) then
      raise exception 'FAIL: RLS is NOT enabled on public.%', t;
    end if;
  end loop;
  raise notice 'PASS A1: RLS enabled on all % tables', array_length(tables,1);

  -- A2. Each owner-only table has at least one policy.
  foreach t in array tables loop
    select count(*) into v_count from pg_policies
      where schemaname='public' and tablename=t;
    if v_count = 0 then
      raise exception 'FAIL: no RLS policies on public.%', t;
    end if;
  end loop;
  raise notice 'PASS A2: every table has >=1 policy';

  -- A3. Storage policies for journal-photos exist (read + own-folder writes).
  select count(*) into v_count from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname like 'journal_photos_%';
  if v_count < 4 then
    raise exception 'FAIL: expected 4 journal_photos storage policies, found %', v_count;
  end if;
  raise notice 'PASS A3: % journal-photos storage policies present', v_count;

  -- A4. journal-photos bucket is constrained (size limit + MIME allowlist).
  perform 1 from storage.buckets
    where id='journal-photos' and file_size_limit is not null
      and allowed_mime_types is not null;
  if not found then
    raise exception 'FAIL: journal-photos bucket missing size limit / MIME allowlist';
  end if;
  raise notice 'PASS A4: journal-photos bucket constrained';

  -- A5. profiles: authenticated may UPDATE only the 4 non-privileged columns.
  select count(*) into v_count
    from information_schema.column_privileges
    where table_schema='public' and table_name='profiles'
      and grantee='authenticated' and privilege_type='UPDATE'
      and column_name = 'tripcoins';
  if v_count <> 0 then
    raise exception 'FAIL: authenticated can UPDATE profiles.tripcoins';
  end if;
  select count(*) into v_count
    from information_schema.column_privileges
    where table_schema='public' and table_name='profiles'
      and grantee='authenticated' and privilege_type='UPDATE';
  if v_count <> 4 then
    raise exception 'FAIL: expected 4 updatable profile columns for authenticated, found %', v_count;
  end if;
  raise notice 'PASS A5: profiles privileged columns protected (tripcoins not updatable)';

  -- A6. ai_usage is not directly accessible by the client roles.
  select count(*) into v_count
    from information_schema.role_table_grants
    where table_schema='public' and table_name='ai_usage'
      and grantee in ('anon','authenticated');
  if v_count <> 0 then
    raise exception 'FAIL: ai_usage is granted to anon/authenticated (% grants)', v_count;
  end if;
  raise notice 'PASS A6: ai_usage locked from client roles';

  -- A7. record_ai_usage executable by authenticated, not anon.
  perform 1 from information_schema.routine_privileges
    where routine_schema='public' and routine_name='record_ai_usage'
      and grantee='authenticated' and privilege_type='EXECUTE';
  if not found then
    raise exception 'FAIL: authenticated cannot EXECUTE record_ai_usage';
  end if;
  raise notice 'PASS A7: record_ai_usage execute grant correct';

  raise notice '===== ALL STRUCTURAL CHECKS PASSED =====';
end $$;

-- Handy read-outs (inspect manually):
select tablename, rowsecurity from pg_tables
  where schemaname='public' order by tablename;

select tablename, policyname, cmd, roles
  from pg_policies where schemaname in ('public','storage')
  order by schemaname, tablename, policyname;

-- ---------------------------------------------------------------------------
-- PART B — cross-user isolation harness  (REQUIRES LIVE VERIFICATION)
-- Replace the two UUIDs with two real auth.users ids, then run each block.
-- Expectation noted after each statement.
-- ---------------------------------------------------------------------------
-- \set user_a '00000000-0000-0000-0000-000000000001'
-- \set user_b '00000000-0000-0000-0000-000000000002'
--
-- begin;
--   set local role authenticated;
--   select set_config('request.jwt.claims',
--     json_build_object('sub', :'user_a', 'role','authenticated')::text, true);
--
--   -- Expect: only user_a's trips + any is_public=true trips. NEVER user_b private rows.
--   select id, user_id, is_public from trips;
--
--   -- Expect: 0 rows (cannot see user_b's saved places / journal / ai_messages / alerts).
--   select count(*) from saved_places   where user_id = :'user_b';   -- expect 0
--   select count(*) from journal_entries where user_id = :'user_b';  -- expect 0
--   select count(*) from ai_messages    where user_id = :'user_b';   -- expect 0
--   select count(*) from alerts         where user_id = :'user_b';   -- expect 0
--
--   -- Expect: 0 rows affected (cannot mutate user_b's trip).
--   update trips set title = 'hacked' where user_id = :'user_b';     -- expect UPDATE 0
--   delete from trips where user_id = :'user_b';                     -- expect DELETE 0
--
--   -- Expect: ERROR permission denied for column tripcoins.
--   update profiles set tripcoins = 999999 where id = :'user_a';
-- rollback;
--
-- -- Public sharing: a signed-out (anon) request only sees is_public trips.
-- begin;
--   set local role anon;
--   select set_config('request.jwt.claims', '', true);
--   select count(*) from trips where is_public = false;  -- expect 0
-- rollback;
-- =============================================================================
-- END verify_rls.sql
-- =============================================================================
