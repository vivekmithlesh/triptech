"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { createTrip } from "@/lib/actions/trips";
import { Button } from "@/components/ui/button";

/**
 * Creates a trip seeded with a destination (+ optional dates) and opens the
 * planner. Sends signed-out users to /auth. Reused by festivals + destinations.
 */
export function PlanTripButton({
  title,
  destination,
  startDate,
  endDate,
  loggedIn,
  label = "Plan a trip around this",
  variant = "default",
  className,
}: {
  title: string;
  destination: string;
  startDate?: string | null;
  endDate?: string | null;
  loggedIn: boolean;
  label?: string;
  variant?: "default" | "outline" | "secondary";
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!loggedIn) {
      toast("Log in to start planning a trip.");
      router.push("/auth");
      return;
    }
    startTransition(async () => {
      try {
        const days =
          startDate && endDate
            ? Math.max(
                1,
                Math.round(
                  (new Date(endDate).getTime() - new Date(startDate).getTime()) /
                    86_400_000
                ) + 1
              )
            : null;
        const trip = await createTrip({
          title,
          destination,
          startDate: startDate ?? null,
          endDate: endDate ?? null,
          days,
        });
        toast.success(`Created “${trip.title}”`);
        router.push(`/trip/${trip.id}`);
      } catch {
        toast.error("Couldn't create the trip.");
      }
    });
  }

  return (
    <Button
      type="button"
      variant={variant}
      onClick={onClick}
      disabled={pending}
      className={className}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Wand2 className="h-4 w-4" />
      )}
      {label}
    </Button>
  );
}
