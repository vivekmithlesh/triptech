# Roamio — Database Setup & Migration Checklist

Apply order for a **fresh** database. All files are idempotent (safe to re-run).

## 1. Extensions (Dashboard → Database → Extensions)
- [ ] `postgis`
- [ ] `vector`
- [ ] `pg_trgm` (also created by migration 0005)

## 2. Baseline (run once, in order)
- [ ] `supabase/schema.sql` — tables, indexes, `handle_new_user` trigger, **RLS enabled + policies on all tables**, `places.save_count` column
- [ ] `supabase/seed_functions.sql` — `insert_place` / `insert_festival` (service-role only)
- [ ] `supabase/functions.sql` — `places_with_coords` / `festivals_with_coords` views + geo RPCs
- [ ] `supabase/ai_functions.sql` — `match_kb` RAG RPC

## 3. Hardening migrations (run after baseline, in order)
- [ ] `migrations/0001_storage_journal_photos.sql` — bucket + Storage RLS
- [ ] `migrations/0002_profile_privileged_columns.sql` — column grants + guard trigger
- [ ] `migrations/0003_ai_usage_rate_limit.sql` — `ai_usage` + `record_ai_usage()`
- [ ] `migrations/0004_places_save_count.sql` — save_count triggers + backfill + view
- [ ] `migrations/0005_search_trgm_indexes.sql` — trigram GIN indexes

> With the Supabase CLI: `supabase db push` applies everything in `migrations/`.
> Baseline files are kept separate because they predate the migrations folder;
> run them first on a brand-new project, or fold them into `migrations/` if you
> adopt the CLI fully.

## 4. Seed data
- [ ] `npm run db:seed`  (needs `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] `npm run ai:embed` (needs `OPENAI_API_KEY`)

## 5. Verify (do not skip)
- [ ] Run `supabase/verification/verify_rls.sql` — PART A must print `ALL STRUCTURAL CHECKS PASSED`
- [ ] Run PART B with two real user UUIDs (cross-user isolation) — **requires live verification**

## 6. Manual dashboard checks (cannot be done in SQL alone)
- [ ] Auth → Providers → Email: confirm "Confirm email" is **ON** for production
- [ ] Auth → URL Configuration: Site URL + redirect URLs include prod domain + `/auth/callback`
- [ ] Auth → Providers → Google: client id/secret set, redirect URI registered
- [ ] Storage → confirm `journal-photos` bucket shows the size limit + MIME allowlist

## Locked-down summary (what the verification proves)
| Concern | Control | File |
|---|---|---|
| Cross-user data read/write | RLS owner-only policies | `schema.sql` |
| Journal upload into others' folders | Storage RLS `foldername[1] = auth.uid()` | `0001` |
| Oversized / non-image upload | bucket `file_size_limit` + `allowed_mime_types` | `0001` |
| Self-editing tripcoins/plan | column GRANTs + guard trigger | `0002` |
| AI cost abuse | `record_ai_usage()` window + daily caps | `0003` |
| save_count full-scan | denormalised column + triggers | `0004` |
| ILIKE seq-scan | pg_trgm GIN indexes | `0005` |
