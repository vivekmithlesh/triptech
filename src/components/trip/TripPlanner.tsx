"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Calendar,
  Clock,
  GripVertical,
  MapPin,
  Plus,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import {
  optimiseTrip,
  removeTripItem,
  reorderTripItems,
  type TripItemPosition,
} from "@/lib/actions/trips";
import type { TripItem, TripWithItems } from "@/types/database";
import { cn, formatDateRange, getCategoryLabel } from "@/lib/utils";
import { dayColor } from "@/components/trip/TripMap";
import { Button } from "@/components/ui/button";

const TripMap = dynamic(() => import("@/components/trip/TripMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
});

type ByDay = Record<number, TripItem[]>;

function buildByDay(items: TripItem[]): ByDay {
  const map: ByDay = {};
  for (const it of items) {
    (map[it.day_number] ??= []).push(it);
  }
  for (const day of Object.keys(map))
    map[Number(day)].sort((a, b) => a.order_index - b.order_index);
  return map;
}

export function TripPlanner({ trip }: { trip: TripWithItems }) {
  const router = useRouter();
  const [byDay, setByDay] = useState<ByDay>(() => buildByDay(trip.items));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [routes, setRoutes] = useState<Record<number, [number, number][]>>({});
  const [optimising, startOptimise] = useTransition();
  const [, startReorder] = useTransition();

  // Re-sync if the server sends a fresh trip (e.g. after optimise/refresh).
  useEffect(() => {
    setByDay(buildByDay(trip.items));
  }, [trip.items]);

  const dayCount = Math.max(
    trip.days ?? 1,
    ...trip.items.map((i) => i.day_number),
    ...Object.keys(byDay).map(Number),
    1
  );
  const days = useMemo(
    () => Array.from({ length: dayCount }, (_, i) => i + 1),
    [dayCount]
  );

  const allItems = useMemo(
    () => days.flatMap((d) => byDay[d] ?? []),
    [days, byDay]
  );
  const activeItem = allItems.find((i) => i.id === activeId) ?? null;

  // OSRM polylines per day (straight-line fallback handled inside TripMap).
  const routeSig = days
    .map((d) => (byDay[d] ?? []).map((i) => i.id).join("-"))
    .join("|");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result: Record<number, [number, number][]> = {};
      for (const day of days) {
        const its = (byDay[day] ?? []).filter((i) => i.place?.location);
        if (its.length < 2) continue;
        const coords = its
          .map((i) => `${i.place!.location!.lng},${i.place!.location!.lat}`)
          .join(";");
        try {
          const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
          );
          const json = await res.json();
          const line = json?.routes?.[0]?.geometry?.coordinates;
          if (Array.isArray(line))
            result[day] = line.map((c: number[]) => [c[1], c[0]]);
        } catch {
          /* keep straight-line fallback */
        }
      }
      if (!cancelled) setRoutes(result);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeSig]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const dayOf = (containerId: string) => Number(containerId.slice(4));
  function findContainer(id: string): string | null {
    if (id.startsWith("day-")) return id;
    for (const day of days) if (byDay[day]?.some((i) => i.id === id)) return `day-${day}`;
    return null;
  }

  function persist(arrangement: ByDay) {
    const positions: TripItemPosition[] = [];
    for (const day of days) {
      (arrangement[day] ?? []).forEach((it, idx) =>
        positions.push({ id: it.id, dayNumber: day, orderIndex: idx })
      );
    }
    startReorder(async () => {
      try {
        await reorderTripItems(trip.id, positions);
      } catch {
        toast.error("Couldn't save the new order.");
        router.refresh();
      }
    });
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeC = findContainer(String(active.id));
    const overC = findContainer(String(over.id));
    if (!activeC || !overC || activeC === overC) return;

    setByDay((prev) => {
      const aDay = dayOf(activeC);
      const oDay = dayOf(overC);
      const aItems = prev[aDay] ?? [];
      const oItems = prev[oDay] ?? [];
      const item = aItems.find((i) => i.id === String(active.id));
      if (!item) return prev;
      const overIsContainer = String(over.id).startsWith("day-");
      const overIndex = overIsContainer
        ? oItems.length
        : oItems.findIndex((i) => i.id === String(over.id));
      const insertAt = overIndex < 0 ? oItems.length : overIndex;
      return {
        ...prev,
        [aDay]: aItems.filter((i) => i.id !== item.id),
        [oDay]: [...oItems.slice(0, insertAt), item, ...oItems.slice(insertAt)],
      };
    });
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) {
      persist(byDay);
      return;
    }
    const activeC = findContainer(String(active.id));
    const overC = findContainer(String(over.id));
    let next = byDay;
    if (activeC && overC && activeC === overC) {
      const day = dayOf(activeC);
      const items = byDay[day] ?? [];
      const oldIndex = items.findIndex((i) => i.id === String(active.id));
      const overIsContainer = String(over.id).startsWith("day-");
      const newIndex = overIsContainer
        ? items.length - 1
        : items.findIndex((i) => i.id === String(over.id));
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        next = { ...byDay, [day]: arrayMove(items, oldIndex, newIndex) };
        setByDay(next);
      }
    }
    persist(next);
  }

  function onRemove(itemId: string) {
    setByDay((prev) => {
      const copy: ByDay = {};
      for (const day of days)
        copy[day] = (prev[day] ?? []).filter((i) => i.id !== itemId);
      return copy;
    });
    startReorder(async () => {
      try {
        await removeTripItem(itemId);
      } catch {
        toast.error("Couldn't remove that stop.");
        router.refresh();
      }
    });
  }

  function onOptimise() {
    startOptimise(async () => {
      try {
        const updated = await optimiseTrip(trip.id);
        if (updated) {
          setByDay(buildByDay(updated.items));
          toast.success("Route optimised");
        }
        router.refresh();
      } catch {
        toast.error("Couldn't optimise this trip.");
      }
    });
  }

  const isEmpty = allItems.length === 0;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      {/* Top bar */}
      <div className="sticky top-16 z-20 border-b bg-background/95 backdrop-blur">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold">{trip.title}</h1>
            <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
              {trip.destination && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {trip.destination}
                </span>
              )}
              {formatDateRange(trip.start_date, trip.end_date) && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDateRange(trip.start_date, trip.end_date)}
                </span>
              )}
              <span>
                {dayCount} day{dayCount === 1 ? "" : "s"} · {allItems.length} stop
                {allItems.length === 1 ? "" : "s"}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/explore">
                <Plus className="h-4 w-4" />
                Add places
              </Link>
            </Button>
            <Button
              size="sm"
              onClick={onOptimise}
              disabled={optimising || allItems.length < 2}
            >
              <Wand2 className={cn("h-4 w-4", optimising && "animate-pulse")} />
              {optimising ? "Optimising…" : "Optimise route"}
            </Button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="container-page grid flex-1 gap-6 py-6 lg:grid-cols-2">
        {/* Day lists */}
        <div className="space-y-5">
          {isEmpty ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-12 text-center">
              <p className="text-muted-foreground">
                No places in this trip yet.
              </p>
              <Button asChild>
                <Link href="/explore">
                  <Plus className="h-4 w-4" />
                  Explore &amp; add places
                </Link>
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
            >
              {days.map((day) => (
                <DayColumn
                  key={day}
                  day={day}
                  items={byDay[day] ?? []}
                  onRemove={onRemove}
                />
              ))}
              <DragOverlay>
                {activeItem ? <ItemCard item={activeItem} overlay /> : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>

        {/* Map */}
        <div className="h-[55vh] overflow-hidden rounded-2xl border lg:sticky lg:top-32 lg:h-[calc(100vh-9rem)]">
          {isEmpty ? (
            <div className="flex h-full items-center justify-center bg-muted text-muted-foreground">
              Add places to see your route
            </div>
          ) : (
            <TripMap items={allItems} routes={routes} />
          )}
        </div>
      </div>
    </div>
  );
}

function DayColumn({
  day,
  items,
  onRemove,
}: {
  day: number;
  items: TripItem[];
  onRemove: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${day}` });
  const color = dayColor(day);

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: color }}
        />
        <h2 className="font-semibold">Day {day}</h2>
        <span className="text-sm text-muted-foreground">
          {items.length} stop{items.length === 1 ? "" : "s"}
        </span>
      </div>

      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={cn(
            "min-h-[64px] space-y-2 rounded-xl border border-dashed p-2 transition-colors",
            isOver && "border-brand bg-brand-light/40"
          )}
        >
          {items.length === 0 ? (
            <p className="py-3 text-center text-sm text-muted-foreground">
              Drag places here
            </p>
          ) : (
            items.map((item) => (
              <SortableItem key={item.id} item={item} onRemove={onRemove} />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  );
}

function SortableItem({
  item,
  onRemove,
}: {
  item: TripItem;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ItemCard item={item} listeners={listeners} attributes={attributes} onRemove={onRemove} />
    </div>
  );
}

type SortableHandle = Pick<
  ReturnType<typeof useSortable>,
  "attributes" | "listeners"
>;

function ItemCard({
  item,
  listeners,
  attributes,
  onRemove,
  overlay = false,
}: {
  item: TripItem;
  listeners?: SortableHandle["listeners"];
  attributes?: SortableHandle["attributes"];
  onRemove?: (id: string) => void;
  overlay?: boolean;
}) {
  const place = item.place;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card p-2.5",
        overlay && "shadow-lg"
      )}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        className="shrink-0 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
        {place?.cover_image && (
          <Image
            src={place.cover_image}
            alt={place.name}
            fill
            sizes="48px"
            className="object-cover"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        {place ? (
          <Link
            href={`/place/${place.id}`}
            className="truncate font-medium hover:text-brand"
          >
            {place.name}
          </Link>
        ) : (
          <span className="truncate font-medium">Unknown place</span>
        )}
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          {place && <span>{getCategoryLabel(place.category)}</span>}
          {item.arrival_time && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {item.arrival_time.slice(0, 5)}
            </span>
          )}
        </p>
      </div>

      {onRemove && !overlay && (
        <button
          type="button"
          aria-label="Remove stop"
          onClick={() => onRemove(item.id)}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
