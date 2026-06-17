"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { createTrip } from "@/lib/actions/trips";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const schema = z
  .object({
    title: z.string().min(1, "Give your trip a name").max(120),
    destination: z.string().max(120).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .refine(
    (v) => !v.startDate || !v.endDate || v.endDate >= v.startDate,
    { message: "End date can't be before the start date", path: ["endDate"] }
  );

type FormValues = z.infer<typeof schema>;

function dayCount(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (Number.isNaN(ms) || ms < 0) return null;
  return Math.round(ms / 86_400_000) + 1;
}

export function CreateTripDialog({
  variant = "default",
}: {
  variant?: "default" | "outline";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    try {
      const trip = await createTrip({
        title: values.title,
        destination: values.destination || null,
        startDate: values.startDate || null,
        endDate: values.endDate || null,
        days: dayCount(values.startDate, values.endDate),
      });
      toast.success(`Created “${trip.title}”`);
      setOpen(false);
      reset();
      router.push(`/trip/${trip.id}`);
    } catch {
      toast.error("Couldn't create the trip.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant}>
          <Plus className="h-4 w-4" />
          New trip
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plan a new trip</DialogTitle>
          <DialogDescription>
            Name it and (optionally) set dates — you can add places next.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="title" className="text-sm font-medium">
              Trip name
            </label>
            <Input id="title" placeholder="Rajasthan road trip" {...register("title")} />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="destination" className="text-sm font-medium">
              Destination <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input id="destination" placeholder="Jaipur, India" {...register("destination")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="startDate" className="text-sm font-medium">
                Start
              </label>
              <Input id="startDate" type="date" {...register("startDate")} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="endDate" className="text-sm font-medium">
                End
              </label>
              <Input id="endDate" type="date" {...register("endDate")} />
              {errors.endDate && (
                <p className="text-sm text-destructive">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create trip
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
