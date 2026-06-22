import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Hoisted mock handles (vi.mock factories are hoisted above imports) ------
const h = vi.hoisted(() => ({
  getUser: vi.fn(),
  rpc: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getUser: h.getUser,
  requireUser: h.getUser,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    rpc: h.rpc,
    from: () => ({
      insert: h.insert,
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null }) }),
      }),
    }),
  }),
}));

vi.mock("@/lib/observability", () => ({
  reportError: vi.fn(),
  reportWarning: vi.fn(),
}));

vi.mock("@/lib/ai/embeddings", () => ({ embed: vi.fn(async () => []) }));
vi.mock("@/lib/ai/retrieve", () => ({ retrieveChunks: vi.fn(async () => []) }));

// Anthropic stub: one streamed text delta so the happy path completes.
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = {
      stream: () => ({
        async *[Symbol.asyncIterator]() {
          yield {
            type: "content_block_delta",
            delta: { type: "text_delta", text: "Hello traveller" },
          };
        },
      }),
    };
  },
}));

import { POST } from "@/app/api/assistant/route";

function req(body: unknown) {
  return new Request("http://localhost/api/assistant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.insert.mockResolvedValue({ error: null });
});

describe("POST /api/assistant", () => {
  it("returns 401 for an anonymous (signed-out) request", async () => {
    h.getUser.mockResolvedValue(null);
    const res = await POST(req({ message: "hi" }));
    expect(res.status).toBe(401);
    // Never consulted the rate limiter or the LLM.
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it("returns 429 when the per-window cap is exceeded", async () => {
    h.getUser.mockResolvedValue({ id: "u1" });
    h.rpc.mockResolvedValue({
      data: { allowed: false, reason: "window", retry_after_seconds: 42 },
      error: null,
    });
    const res = await POST(req({ message: "hi" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
    // Rate limit was checked before any AI work; no message persisted.
    expect(h.rpc).toHaveBeenCalledWith(
      "record_ai_usage",
      expect.objectContaining({
        p_max_per_window: expect.any(Number),
        p_max_per_day: expect.any(Number),
        p_window_minutes: expect.any(Number),
      })
    );
    expect(h.insert).not.toHaveBeenCalled();
  });

  it("returns 429 with a daily-cap message when the daily cap is hit", async () => {
    h.getUser.mockResolvedValue({ id: "u1" });
    h.rpc.mockResolvedValue({
      data: { allowed: false, reason: "daily", retry_after_seconds: 3600 },
      error: null,
    });
    const res = await POST(req({ message: "hi" }));
    expect(res.status).toBe(429);
    expect(await res.text()).toMatch(/today/i);
  });

  it("fails closed with 503 when the rate-limit RPC errors", async () => {
    h.getUser.mockResolvedValue({ id: "u1" });
    h.rpc.mockResolvedValue({ data: null, error: { message: "db down" } });
    const res = await POST(req({ message: "hi" }));
    expect(res.status).toBe(503);
  });

  it("rejects an empty message with 400 (after auth)", async () => {
    h.getUser.mockResolvedValue({ id: "u1" });
    const res = await POST(req({ message: "   " }));
    expect(res.status).toBe(400);
  });

  it("passes the rate check and streams a 200 response when allowed", async () => {
    h.getUser.mockResolvedValue({ id: "u1" });
    h.rpc.mockResolvedValue({
      data: { allowed: true, daily_count: 1, window_count: 1 },
      error: null,
    });
    const res = await POST(req({ message: "what should I see in Goa?" }));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Hello traveller");
    // Both the user turn and the assistant turn were persisted.
    expect(h.insert).toHaveBeenCalledTimes(2);
  });
});
