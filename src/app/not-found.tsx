import Link from "next/link";
import { Compass, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/20 px-6 text-center">
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <Compass className="h-6 w-6 text-brand" />
        <span className="text-lg">Roamio</span>
      </Link>
      <div>
        <p className="text-6xl font-semibold text-brand">404</p>
        <h1 className="mt-2 text-2xl font-semibold">This trail leads nowhere</h1>
        <p className="mt-1 max-w-sm text-muted-foreground">
          The page you&apos;re looking for has wandered off. Let&apos;s get you
          back on the map.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/explore">
            <MapPin className="h-4 w-4" />
            Explore the map
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
