import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import { getPlaceById } from "@/lib/actions/places";
import { getUser } from "@/lib/auth";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "AI Guide",
  description:
    "Ask Roamio's AI travel guide anything — grounded in verified local knowledge, never invented.",
};

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const user = await getUser();

  if (!user) {
    return (
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand">
          <Sparkles className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold">Meet your AI travel guide</h1>
          <p className="mx-auto mt-1 max-w-md text-muted-foreground">
            Log in to chat with a guide grounded in verified local knowledge —
            monument histories, arrival briefs, and trip ideas.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/auth">Log in to chat</Link>
        </Button>
      </div>
    );
  }

  const placeId = first(searchParams.placeId);
  const place = placeId ? await getPlaceById(placeId).catch(() => null) : null;

  return (
    <AssistantChat
      placeContext={
        place
          ? { id: place.id, name: place.name, city: place.city }
          : null
      }
    />
  );
}
