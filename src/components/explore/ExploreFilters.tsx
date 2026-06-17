"use client";

import { useState } from "react";
import { Landmark, SlidersHorizontal, X } from "lucide-react";

import { CATEGORIES } from "@/lib/constants";
import { cn, priceLevel } from "@/lib/utils";
import type { PlaceCategory } from "@/types/database";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";

export type SortKey = "rating" | "reviews" | "name";

export interface ExploreFiltersState {
  category?: PlaceCategory;
  /** Max price_level 1–4 (undefined = any). */
  maxPrice?: number;
  /** Minimum rating (undefined = any). */
  minRating?: number;
  historicOnly?: boolean;
  q?: string;
  sort: SortKey;
}

const SORTS: { value: SortKey; label: string }[] = [
  { value: "rating", label: "Top rated" },
  { value: "reviews", label: "Most reviewed" },
  { value: "name", label: "Name A–Z" },
];

const RATINGS = [
  { value: "0", label: "Any rating" },
  { value: "3.5", label: "3.5+" },
  { value: "4", label: "4.0+" },
  { value: "4.5", label: "4.5+" },
];

export function ExploreFilters({
  filters,
  onChange,
  onReset,
  count,
  loading,
}: {
  filters: ExploreFiltersState;
  onChange: (patch: Partial<ExploreFiltersState>) => void;
  onReset: () => void;
  count: number;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const advancedActive =
    (filters.maxPrice ? 1 : 0) +
    (filters.minRating ? 1 : 0) +
    (filters.historicOnly ? 1 : 0);

  const priceValue = filters.maxPrice ?? 4;

  return (
    <div className="space-y-3">
      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Chip
          active={!filters.category}
          onClick={() => onChange({ category: undefined })}
        >
          All
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            active={filters.category === c.id}
            onClick={() => onChange({ category: c.id })}
          >
            <c.icon className="h-3.5 w-3.5" />
            {c.label}
          </Chip>
        ))}
      </div>

      {/* Count + sort + more filters */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {loading ? "Searching…" : `${count} place${count === 1 ? "" : "s"}`}
        </p>

        <div className="flex items-center gap-2">
          <Select
            value={filters.sort}
            onValueChange={(v) => onChange({ sort: v as SortKey })}
          >
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {advancedActive > 0 && (
                  <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-medium text-white">
                    {advancedActive}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-sm">
              <SheetHeader>
                <SheetTitle>More filters</SheetTitle>
                <SheetDescription>
                  Narrow the results by budget, rating and heritage.
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-8">
                {/* Price */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Max budget</label>
                    <span className="text-sm text-muted-foreground">
                      {priceValue >= 4
                        ? "Any price"
                        : `${priceLevel(priceValue)} & under`}
                    </span>
                  </div>
                  <Slider
                    min={1}
                    max={4}
                    step={1}
                    value={[priceValue]}
                    onValueChange={([v]) =>
                      onChange({ maxPrice: v >= 4 ? undefined : v })
                    }
                  />
                </div>

                {/* Rating */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Minimum rating</label>
                  <Select
                    value={String(filters.minRating ?? 0)}
                    onValueChange={(v) =>
                      onChange({ minRating: Number(v) || undefined })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RATINGS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Historic */}
                <button
                  type="button"
                  onClick={() =>
                    onChange({ historicOnly: !filters.historicOnly })
                  }
                  aria-pressed={!!filters.historicOnly}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors",
                    filters.historicOnly
                      ? "border-brand bg-brand-light"
                      : "hover:bg-accent"
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Landmark className="h-4 w-4 text-brand" />
                    Historic places only
                  </span>
                  <span
                    className={cn(
                      "h-5 w-9 rounded-full p-0.5 transition-colors",
                      filters.historicOnly ? "bg-brand" : "bg-muted-foreground/30"
                    )}
                  >
                    <span
                      className={cn(
                        "block h-4 w-4 rounded-full bg-white transition-transform",
                        filters.historicOnly && "translate-x-4"
                      )}
                    />
                  </span>
                </button>
              </div>

              <SheetFooter className="mt-8 flex-row gap-2">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    onReset();
                    setOpen(false);
                  }}
                >
                  <X className="h-4 w-4" />
                  Reset
                </Button>
                <SheetClose asChild>
                  <Button className="flex-1">Show {count} results</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-brand bg-brand text-white"
          : "bg-background hover:bg-accent"
      )}
    >
      {children}
    </button>
  );
}
