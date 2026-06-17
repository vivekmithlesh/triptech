"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, MapPin, PlaneLanding, Sparkles, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PlaceContext {
  id: string;
  name: string;
  city: string | null;
}

export function AssistantChat({
  placeContext,
}: {
  placeContext: PlaceContext | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [landed, setLanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const suggestions = placeContext
    ? [
        `Tell me about ${placeContext.name}`,
        `What's the history of ${placeContext.name}?`,
        placeContext.city ? `Best time to visit ${placeContext.city}?` : "Plan me 3 days nearby",
      ]
    : [
        "I just landed in Jaipur, what now?",
        "Plan me 3 days in Goa",
        "What's the history of Amber Fort?",
      ];

  async function send(rawText: string, opts?: { mode?: "guide" | "receptionist" }) {
    const text = rawText.trim();
    if (!text || sending) return;

    const mode = opts?.mode ?? (landed ? "receptionist" : "guide");
    const city = mode === "receptionist" ? text : placeContext?.city ?? undefined;
    const userContent =
      mode === "receptionist" && !rawText.toLowerCase().includes("land")
        ? `I just landed in ${text}.`
        : text;

    setLanded(false);
    setInput("");
    setMessages((m) => [
      ...m,
      { role: "user", content: userContent },
      { role: "assistant", content: "" },
    ]);
    setSending(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userContent,
          placeId: placeContext?.id,
          city,
          mode,
        }),
      });

      if (!res.ok || !res.body) {
        const note =
          res.status === 401
            ? "Please log in again to keep chatting."
            : res.status === 429
              ? "You're sending messages too fast — give it a few seconds."
              : "Something went wrong. Please try again.";
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: note };
          return copy;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "assistant",
          content: "Network error — please try again.",
        };
        return copy;
      });
    } finally {
      setSending(false);
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="container-page mx-auto max-w-3xl py-6">
          {/* Place context chip */}
          {placeContext && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm">
              <MapPin className="h-3.5 w-3.5 text-brand" />
              Asking about{" "}
              <Link href={`/place/${placeContext.id}`} className="font-medium text-brand">
                {placeContext.name}
              </Link>
            </div>
          )}

          {empty ? (
            <div className="flex flex-col items-center gap-6 py-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white">
                <Sparkles className="h-7 w-7" />
              </span>
              <div>
                <h1 className="text-2xl font-semibold">Ask your AI travel guide</h1>
                <p className="mx-auto mt-1 max-w-md text-muted-foreground">
                  Grounded in verified local knowledge. If it doesn&apos;t know,
                  it&apos;ll say so — never invented.
                </p>
              </div>
              <div className="flex w-full max-w-md flex-col gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-xl border bg-card px-4 py-3 text-left text-sm transition-colors hover:border-brand/40 hover:bg-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex",
                    m.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm",
                      m.role === "user"
                        ? "bg-brand text-white"
                        : "border bg-card"
                    )}
                  >
                    {m.content || (
                      <span className="inline-flex gap-1">
                        <Dot /> <Dot /> <Dot />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t bg-background/95 backdrop-blur">
        <div className="container-page mx-auto max-w-3xl py-3">
          {landed && (
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-light px-3 py-1 text-xs font-medium text-brand-teal">
              <PlaneLanding className="h-3.5 w-3.5" />
              Receptionist mode — type the city you landed in
              <button type="button" onClick={() => setLanded(false)} aria-label="Cancel">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2"
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLanded((v) => !v)}
              className="shrink-0"
            >
              <PlaneLanding className="h-4 w-4" />
              <span className="hidden sm:inline">Just landed</span>
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                landed ? "Which city did you just land in?" : "Ask anything about your trip…"
              }
              disabled={sending}
              className="h-11"
            />
            <Button
              type="submit"
              size="icon"
              disabled={sending || !input.trim()}
              aria-label="Send"
              className="h-11 w-11 shrink-0"
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
          </form>
          <p className="mt-1.5 text-center text-xs text-muted-foreground">
            Answers are grounded in verified data. Roamio won&apos;t invent facts.
          </p>
        </div>
      </div>
    </div>
  );
}

function Dot() {
  return (
    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
  );
}
