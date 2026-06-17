"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Heart, LayoutDashboard, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/trips", label: "Trips", icon: MapPin, exact: false },
  { href: "/dashboard/saved", label: "Saved", icon: Heart, exact: false },
  { href: "/dashboard/alerts", label: "Alerts", icon: Bell, exact: false },
] as const;

export function DashboardNavLinks({
  variant,
}: {
  variant: "sidebar" | "bottom";
}) {
  const pathname = usePathname();
  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  if (variant === "bottom") {
    return (
      <>
        {ITEMS.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs",
                active ? "text-brand" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </>
    );
  }

  return (
    <nav className="flex flex-col gap-1">
      {ITEMS.map((item) => {
        const active = isActive(item.href, item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand-light text-brand-teal"
                : "text-foreground/70 hover:bg-accent"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
