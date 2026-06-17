import OpenAI from "openai";

export const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dims
export const EMBEDDING_DIMS = 1536;

// Lazily constructed so importing this module never throws when the key is
// absent (e.g. during `next build` page-data collection). Key is server-only.
let _openai: OpenAI | null = null;
function client(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

/** Embeds a single piece of text into a 1536-dim vector. */
export async function embed(text: string): Promise<number[]> {
  const input = text.replace(/\s+/g, " ").trim().slice(0, 8000);
  const res = await client().embeddings.create({
    model: EMBEDDING_MODEL,
    input,
  });
  return res.data[0].embedding;
}

/** pgvector literal form (`[0.1,0.2,...]`) — the safe way to pass/store vectors. */
export function toVectorLiteral(vec: number[]): string {
  return JSON.stringify(vec);
}
