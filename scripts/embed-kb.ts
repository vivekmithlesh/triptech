/**
 * One-time KB embedder. Reads every kb_chunks row with a null embedding,
 * embeds its content via OpenAI text-embedding-3-small (1536 dims), and writes
 * the vector back. Safe to re-run — only embeds rows that still need it.
 *
 * Run:  npx tsx scripts/embed-kb.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
if (!openaiKey) {
  console.error("Missing OPENAI_API_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});
const openai = new OpenAI({ apiKey: openaiKey });

interface ChunkRow {
  id: string;
  content: string;
}

async function main() {
  const { data, error } = await supabase
    .from("kb_chunks")
    .select("id, content")
    .is("embedding", null);
  if (error) {
    console.error("Failed to read kb_chunks:", error.message);
    process.exit(1);
  }

  const chunks = (data ?? []) as ChunkRow[];
  if (chunks.length === 0) {
    console.log("All kb_chunks already embedded. Nothing to do.");
    return;
  }

  console.log(`Embedding ${chunks.length} kb_chunks with text-embedding-3-small...`);
  let done = 0;
  for (const chunk of chunks) {
    const res = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunk.content.replace(/\s+/g, " ").trim(),
    });
    const vector = JSON.stringify(res.data[0].embedding); // pgvector literal

    const { error: upErr } = await supabase
      .from("kb_chunks")
      .update({ embedding: vector })
      .eq("id", chunk.id);
    if (upErr) {
      console.error(`Failed updating chunk ${chunk.id}:`, upErr.message);
      process.exit(1);
    }
    done += 1;
    process.stdout.write(`\r  embedded ${done}/${chunks.length}`);
  }
  console.log(`\nDone. Embedded ${done} kb_chunks.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
