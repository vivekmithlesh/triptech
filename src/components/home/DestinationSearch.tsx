"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

import { POPULAR_DESTINATIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Hero destination search. Sends the traveller to the Explore map (Brick 08),
// which reads `?q=` as a destination/place query.
export function DestinationSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function go(value: string) {
    const v = value.trim();
    router.push(v ? `/explore?q=${encodeURIComponent(v)}` : "/explore");
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Where to? Try Jaipur, Goa, Bali…"
            aria-label="Search a destination"
            className="h-12 bg-white pl-9 text-base text-foreground"
          />
        </div>
        <Button type="submit" size="lg" variant="secondary" className="h-12">
          <Search className="h-4 w-4" />
          Explore
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {POPULAR_DESTINATIONS.slice(0, 6).map((d) => (
          <button
            key={d.city}
            type="button"
            onClick={() => go(d.city)}
            className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-sm text-white/90 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            {d.city}
          </button>
        ))}
      </div>
    </div>
  );
}
