"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { reportError } from "@/lib/observability";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { source: "app/error.tsx", digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/20 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="h-7 w-7" />
      </span>
      <div>
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-1 max-w-sm text-muted-foreground">
          We hit an unexpected error. Try again, or head back to the map.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
