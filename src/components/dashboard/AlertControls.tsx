"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { createAlert, deleteAlert } from "@/lib/actions/alerts";
import type { AlertType } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALERT_TYPES: { value: AlertType; label: string }[] = [
  { value: "festival", label: "Festival nearby" },
  { value: "best_time", label: "Best time to visit" },
  { value: "price_drop", label: "Price drop" },
];

export function CreateAlertForm() {
  const router = useRouter();
  const [type, setType] = useState<AlertType>("festival");
  const [destination, setDestination] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const dest = destination.trim();
    if (!dest) {
      toast.error("Enter a destination to watch.");
      return;
    }
    startTransition(async () => {
      try {
        await createAlert({ type, filters: { destination: dest } });
        toast.success("Alert created");
        setDestination("");
        router.refresh();
      } catch {
        toast.error("Couldn't create the alert.");
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-end"
    >
      <div className="space-y-1.5 sm:w-52">
        <label className="text-sm font-medium">Alert me about</label>
        <Select value={type} onValueChange={(v) => setType(v as AlertType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALERT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1 space-y-1.5">
        <label htmlFor="alert-dest" className="text-sm font-medium">
          Destination
        </label>
        <Input
          id="alert-dest"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Jaipur, Goa, Bali…"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Add alert
      </Button>
    </form>
  );
}

export function DeleteAlertButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      try {
        await deleteAlert(id);
        router.refresh();
      } catch {
        toast.error("Couldn't remove that alert.");
      }
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Remove alert"
      onClick={onClick}
      disabled={pending}
      className="text-muted-foreground hover:text-destructive"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
    </Button>
  );
}
