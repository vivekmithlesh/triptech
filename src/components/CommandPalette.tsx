"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, MapPin, Search, Star } from "lucide-react";

import { getPlaces } from "@/lib/actions/places";
import { POPULAR_DESTINATIONS } from "@/lib/constants";
import { cn, formatLocation, formatRating, getCategoryIcon } from "@/lib/utils";
import type { Place } from "@/types/database";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // Global ⌘K / Ctrl+K toggle.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounced place search.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = query.trim();
    if (!q) {
      setPlaces([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        setPlaces(await getPlaces({ q, limit: 6 }));
      } catch {
        setPlaces([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer.current);
  }, [query]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  const destinations = (
    query.trim()
      ? POPULAR_DESTINATIONS.filter((d) =>
          `${d.city} ${d.country}`.toLowerCase().includes(query.toLowerCase())
        )
      : POPULAR_DESTINATIONS
  ).slice(0, 4);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[15%] translate-y-0 gap-0 p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">Search Roamio</DialogTitle>
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim())
                go(`/explore?q=${encodeURIComponent(query.trim())}`);
            }}
            placeholder="Search places or destinations…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {/* Destinations */}
          {destinations.length > 0 && (
            <div className="mb-1">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                Destinations
              </p>
              {destinations.map((d) => (
                <Row
                  key={d.city}
                  icon={<Compass className="h-4 w-4 text-brand" />}
                  title={d.city}
                  subtitle={`${d.country} · ${d.blurb}`}
                  onClick={() => go(`/destination/${encodeURIComponent(d.city)}`)}
                />
              ))}
            </div>
          )}

          {/* Places */}
          {query.trim() && (
            <div>
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                Places
              </p>
              {loading && places.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">Searching…</p>
              ) : places.length === 0 ? (
                <button
                  type="button"
                  onClick={() => go(`/explore?q=${encodeURIComponent(query.trim())}`)}
                  className="w-full rounded-lg px-2 py-3 text-left text-sm hover:bg-accent"
                >
                  Search “{query.trim()}” on the map →
                </button>
              ) : (
                places.map((p) => {
                  const Icon = getCategoryIcon(p.category);
                  return (
                    <Row
                      key={p.id}
                      icon={<Icon className="h-4 w-4 text-brand" />}
                      title={p.name}
                      subtitle={formatLocation(p.city, p.country)}
                      meta={
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="h-3 w-3 fill-brand-sand text-brand-sand" />
                          {formatRating(p.rating)}
                        </span>
                      }
                      onClick={() => go(`/place/${p.id}`)}
                    />
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="border-t px-4 py-2 text-center text-xs text-muted-foreground">
          <MapPin className="mr-1 inline h-3 w-3" />
          Press <kbd className="rounded bg-muted px-1">⌘K</kbd> anytime to search
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  icon,
  title,
  subtitle,
  meta,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent"
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-light">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        {subtitle && (
          <span className="block truncate text-xs text-muted-foreground">
            {subtitle}
          </span>
        )}
      </span>
      {meta}
    </button>
  );
}
