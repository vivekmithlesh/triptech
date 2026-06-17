"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";

import { toggleSaved } from "@/lib/actions/saved";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function SavePlaceButton({
  placeId,
  placeName,
  initialSaved = false,
  className,
}: {
  placeId: string;
  placeName: string;
  initialSaved?: boolean;
  className?: string;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (pending) return;
    const optimistic = !saved;
    setSaved(optimistic);
    startTransition(async () => {
      try {
        const res = await toggleSaved(placeId);
        setSaved(res.saved);
        if (res.saved) toast.success(`Saved ${placeName}`);
        else toast(`Removed ${placeName}`);
      } catch {
        setSaved(!optimistic);
        toast.error("Couldn't update your saved places.");
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={pending}
      aria-pressed={saved}
      className={className}
    >
      <Heart
        className={cn("h-4 w-4", saved && "fill-rose-500 text-rose-500")}
      />
      {saved ? "Saved" : "Save"}
    </Button>
  );
}
