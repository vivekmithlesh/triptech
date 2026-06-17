"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Compass, Menu, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { UserMenu, type UserMenuProps } from "@/components/UserMenu";

export function NavbarClient({ user }: { user: UserMenuProps | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container-page flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold">
          <Compass className="h-6 w-6 text-brand" />
          <span className="text-lg">Roamio</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive(item.href) ? "text-brand" : "text-foreground/70"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/assistant">
              <Sparkles className="h-4 w-4 text-brand" />
              AI Guide
            </Link>
          </Button>
          {user ? (
            <UserMenu {...user} />
          ) : (
            <Button asChild size="sm">
              <Link href="/auth">Log in</Link>
            </Button>
          )}
        </div>

        {/* Mobile menu */}
        <div className="flex items-center gap-2 md:hidden">
          {user ? <UserMenu {...user} /> : null}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-brand" />
                Roamio
              </SheetTitle>
              <div className="mt-6 flex flex-col gap-1">
                {NAV_ITEMS.map((item) => (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent",
                        isActive(item.href) ? "text-brand" : "text-foreground/80"
                      )}
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <Link
                    href="/assistant"
                    className="mt-1 flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent"
                  >
                    <Sparkles className="h-4 w-4 text-brand" />
                    AI Guide
                  </Link>
                </SheetClose>
              </div>

              {!user && (
                <SheetClose asChild>
                  <Button asChild className="mt-6 w-full">
                    <Link href="/auth">Log in</Link>
                  </Button>
                </SheetClose>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
