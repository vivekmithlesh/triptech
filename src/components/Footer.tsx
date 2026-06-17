import Link from "next/link";
import { Compass } from "lucide-react";

import { NAV_ITEMS } from "@/lib/constants";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t bg-muted/30">
      <div className="container-page flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xs space-y-2">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Compass className="h-5 w-5 text-brand" />
            <span className="text-lg">Roamio</span>
          </Link>
          <p className="text-sm text-muted-foreground">
            Travel the world with an AI in your pocket. Plan smart trips, learn
            every place, and explore like a local.
          </p>
        </div>

        <nav className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Explore</p>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-brand"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <nav className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Company</p>
          <Link
            href="/assistant"
            className="text-sm text-muted-foreground transition-colors hover:text-brand"
          >
            AI Guide
          </Link>
          <Link
            href="/auth"
            className="text-sm text-muted-foreground transition-colors hover:text-brand"
          >
            Sign in
          </Link>
        </nav>
      </div>

      <div className="border-t">
        <div className="container-page py-4 text-xs text-muted-foreground">
          © {year} Roamio. Made for travellers.
        </div>
      </div>
    </footer>
  );
}
