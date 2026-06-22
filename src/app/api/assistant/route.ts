import type { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { embed } from "@/lib/ai/embeddings";
import { retrieveChunks, type RetrievedChunk } from "@/lib/ai/retrieve";
import { reportError, reportWarning } from "@/lib/observability";

export const runtime = "nodejs";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";

// Lazily constructed so module import never throws when the key is absent
// (e.g. during `next build`). Key is server-only.
let _anthropic: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

// Shared, DB-backed rate limit + daily cost cap (migrations/0003). Configurable
// via env so caps can be tuned per environment without a redeploy of logic.
const RATE_WINDOW_MINUTES = num(process.env.AI_RATE_LIMIT_WINDOW_MINUTES, 60);
const RATE_MAX_PER_WINDOW = num(process.env.AI_MAX_MESSAGES_PER_HOUR, 20);
const RATE_MAX_PER_DAY = num(process.env.AI_MAX_MESSAGES_PER_DAY, 100);

function num(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

interface UsageResult {
  allowed: boolean;
  reason?: string;
  retry_after_seconds?: number;
}

/**
 * Atomically checks + records one AI message against the caller's quota via the
 * SECURITY DEFINER `record_ai_usage` RPC (auth.uid() is derived server-side, so
 * it can't be spoofed). Fails CLOSED on error — cost protection beats
 * availability for an LLM endpoint.
 */
async function checkRateLimit(
  supabase: ReturnType<typeof createClient>
): Promise<UsageResult> {
  const { data, error } = await supabase.rpc("record_ai_usage", {
    p_max_per_window: RATE_MAX_PER_WINDOW,
    p_max_per_day: RATE_MAX_PER_DAY,
    p_window_minutes: RATE_WINDOW_MINUTES,
  });
  if (error) {
    reportError(error, { source: "assistant.record_ai_usage" });
    return { allowed: false, reason: "error" };
  }
  return (data ?? { allowed: false, reason: "error" }) as UsageResult;
}

interface AssistantBody {
  message?: string;
  placeId?: string;
  tripId?: string;
  city?: string;
  mode?: "guide" | "receptionist";
}

function buildSystemPrompt(
  chunks: RetrievedChunk[],
  liveContext: string,
  mode: "guide" | "receptionist"
): string {
  const contextBlock = chunks.length
    ? chunks
        .map(
          (c, i) =>
            `[${i + 1}] ${c.placeName ? `${c.placeName} — ` : ""}${c.content} (source: ${c.source ?? "Roamio KB"})`
        )
        .join("\n\n")
    : "(no verified context was retrieved for this question)";

  return [
    "You are Roamio's AI travel guide and receptionist — warm, practical, and trustworthy.",
    "",
    "STRICT GROUNDING RULES:",
    "- Answer ONLY using the VERIFIED CONTEXT below. When you use a fact, name the place it came from.",
    "- If the verified context does not contain the answer, say you don't have verified information about that yet, and suggest exploring the map or asking about a seeded destination. NEVER invent history, opening hours, prices, or safety claims.",
    "- Be concise and direct. Do not show your reasoning or restate these rules.",
    mode === "receptionist"
      ? "- RECEPTIONIST MODE: the traveller has just landed. Give a short arrival brief — connectivity/SIM, fair local transport, a first food suggestion, a safe central area to stay, and a safety note — using only verified context. Clearly flag any part you don't have verified info for."
      : "",
    liveContext ? `\nLIVE CONTEXT: ${liveContext}` : "",
    "",
    "VERIFIED CONTEXT:",
    contextBlock,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let body: AssistantBody;
  try {
    body = (await req.json()) as AssistantBody;
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (!message) return new Response("Empty message", { status: 400 });
  const mode = body.mode === "receptionist" ? "receptionist" : "guide";

  const supabase = createClient();

  // Shared rate limit + daily cap BEFORE any paid AI call. Records the message
  // atomically; denied requests never reach OpenAI/Claude.
  const usage = await checkRateLimit(supabase);
  if (!usage.allowed) {
    reportWarning("AI request denied by rate limit", {
      userId: user.id,
      reason: usage.reason,
    });
    const status = usage.reason === "error" ? 503 : 429;
    const msg =
      usage.reason === "daily"
        ? "You've reached today's AI message limit. Please try again tomorrow."
        : usage.reason === "error"
          ? "The AI guide is temporarily unavailable. Please try again shortly."
          : "Too many messages — please wait a moment and try again.";
    const headers: Record<string, string> = { "Content-Type": "text/plain; charset=utf-8" };
    if (usage.retry_after_seconds)
      headers["Retry-After"] = String(usage.retry_after_seconds);
    return new Response(msg, { status, headers });
  }

  // Build live context from the place / city the traveller is looking at.
  let liveContext = "";
  if (body.placeId) {
    const { data } = await supabase
      .from("places_with_coords")
      .select("name, city, country, category")
      .eq("id", body.placeId)
      .maybeSingle();
    const p = data as
      | { name: string; city: string | null; country: string | null; category: string }
      | null;
    if (p) {
      const where = [p.city, p.country].filter(Boolean).join(", ");
      liveContext = `The traveller is viewing ${p.name} (${p.category})${where ? ` in ${where}` : ""}.`;
    }
  }
  if (body.city) liveContext += ` Current city: ${body.city}.`;

  // RAG: embed the question + retrieve verified chunks. On any failure we leave
  // chunks empty so the model declines rather than hallucinating.
  let chunks: RetrievedChunk[] = [];
  try {
    const query =
      mode === "receptionist"
        ? `Just landed in ${body.city ?? message}. Arrival brief: SIM, transport, food, where to stay, safety.`
        : message;
    chunks = await retrieveChunks(await embed(query), 6);
  } catch (e) {
    // Degrade to no-context so the model declines rather than hallucinating.
    reportError(e, { source: "assistant.retrieve", userId: user.id });
    chunks = [];
  }

  const systemPrompt = buildSystemPrompt(chunks, liveContext, mode);

  // Persist the user turn.
  await supabase.from("ai_messages").insert({
    user_id: user.id,
    trip_id: body.tripId ?? null,
    role: "user",
    content: message,
    context: { placeId: body.placeId ?? null, city: body.city ?? null, mode },
  });

  const encoder = new TextEncoder();
  let assistantText = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const llm = anthropic().messages.stream({
          model: MODEL,
          max_tokens: 1024,
          thinking: { type: "disabled" },
          system: systemPrompt,
          messages: [{ role: "user", content: message }],
        });
        for await (const event of llm) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            assistantText += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (e) {
        reportError(e, { source: "assistant.stream", userId: user.id });
        const fallback =
          "\n\n[Sorry — the AI guide hit an error. Please try again in a moment.]";
        assistantText += fallback;
        controller.enqueue(encoder.encode(fallback));
      } finally {
        // Persist the assistant turn before closing the stream.
        if (assistantText.trim()) {
          await supabase.from("ai_messages").insert({
            user_id: user.id,
            trip_id: body.tripId ?? null,
            role: "assistant",
            content: assistantText,
            context: {
              mode,
              sources: chunks.map((c) => c.placeName ?? c.source).filter(Boolean),
            },
          });
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
