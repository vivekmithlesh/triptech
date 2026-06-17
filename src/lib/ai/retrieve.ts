import { createClient } from "@/lib/supabase/server";
import { toVectorLiteral } from "@/lib/ai/embeddings";

export interface RetrievedChunk {
  content: string;
  source: string | null;
  placeName: string | null;
  similarity: number;
}

interface MatchRow {
  id: string;
  place_id: string | null;
  content: string;
  source: string | null;
  place_name: string | null;
  similarity: number;
}

/**
 * Retrieves the top-k most similar VERIFIED kb_chunks for a query vector via
 * the `match_kb` pgvector RPC (cosine). Returns content + source + place name.
 */
export async function retrieveChunks(
  queryVec: number[],
  k = 6
): Promise<RetrievedChunk[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("match_kb", {
    query_embedding: toVectorLiteral(queryVec),
    match_count: k,
  });
  if (error) throw new Error(`retrieveChunks: ${error.message}`);
  return ((data ?? []) as MatchRow[]).map((r) => ({
    content: r.content,
    source: r.source,
    placeName: r.place_name,
    similarity: r.similarity,
  }));
}
