-- =============================================================================
-- Roamio AI / RAG SQL — paste into the Supabase SQL Editor and RUN once,
-- AFTER schema.sql + the seed, and AFTER `npx tsx scripts/embed-kb.ts` has
-- written embeddings (the function works before embedding too — it simply
-- returns nothing until embeddings exist).
--
-- Provides:
--   - match_kb(query_embedding, match_count) : pgvector cosine similarity over
--     VERIFIED kb_chunks, joined to the place name. Powers the AI guide's RAG.
--
-- The ivfflat cosine index on kb_chunks.embedding was created in schema.sql
-- (Brick 01). Idempotent: safe to re-run.
-- =============================================================================

set search_path = public, extensions;

create or replace function public.match_kb(
  query_embedding vector(1536),
  match_count int default 6
)
returns table (
  id uuid,
  place_id uuid,
  content text,
  source text,
  place_name text,
  similarity float
)
language sql
stable
set search_path = public, extensions
as $$
  select
    k.id,
    k.place_id,
    k.content,
    k.source,
    p.name as place_name,
    1 - (k.embedding <=> query_embedding) as similarity
  from public.kb_chunks k
  left join public.places p on p.id = k.place_id
  where k.embedding is not null
    and k.verified = true
  order by k.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_kb(vector, int) to anon, authenticated;

-- =============================================================================
-- END
-- =============================================================================
