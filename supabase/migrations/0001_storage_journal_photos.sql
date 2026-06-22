-- =============================================================================
-- Migration 0001 — Secure journal photo storage
-- Apply with the Supabase CLI (`supabase db push`) or paste into the SQL Editor.
-- IDEMPOTENT: safe to re-run.
--
-- Creates the `journal-photos` bucket with a hard size limit + image-only MIME
-- allowlist, and Storage RLS so a user can only write into their OWN folder
-- (`<auth.uid()>/...`). Read stays public because the app renders photos via
-- getPublicUrl with unguessable (uuid/timestamp) filenames; flip `public` to
-- false + switch the app to signed URLs if journals must be private.
-- =============================================================================

-- 1. Bucket (5 MiB cap, image types only) ------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'journal-photos',
  'journal-photos',
  true,                       -- public READ only; writes are locked by RLS below
  5242880,                    -- 5 MiB
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update
  set public            = excluded.public,
      file_size_limit   = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. Storage RLS policies (RLS is already enabled on storage.objects) ---------
-- READ: anyone may read objects in this bucket (public travel photos).
drop policy if exists "journal_photos_read" on storage.objects;
create policy "journal_photos_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'journal-photos');

-- INSERT: only into a folder named after the caller's uid.
drop policy if exists "journal_photos_insert_own" on storage.objects;
create policy "journal_photos_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'journal-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- UPDATE: only your own files.
drop policy if exists "journal_photos_update_own" on storage.objects;
create policy "journal_photos_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'journal-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'journal-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- DELETE: only your own files (used for cleanup after a failed DB insert).
drop policy if exists "journal_photos_delete_own" on storage.objects;
create policy "journal_photos_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'journal-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- =============================================================================
-- END 0001
-- =============================================================================
