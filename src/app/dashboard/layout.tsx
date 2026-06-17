import Link from "next/link";
import { Compass, LogOut } from "lucide-react";

import { getProfile, requireUser } from "@/lib/auth";
import { DashboardNavLinks } from "@/components/dashboard/DashboardNavLinks";
import { UserMenu } from "@/components/UserMenu";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const profile = await getProfile();

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b bg-background px-4 py-3 lg:hidden">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Compass className="h-5 w-5 text-brand" />
          Roamio
        </Link>
        <UserMenu
          email={user.email ?? ""}
          fullName={profile?.full_name}
          avatarUrl={profile?.avatar_url}
        />
      </header>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r bg-background p-4 lg:flex">
        <Link href="/" className="mb-6 flex items-center gap-2 px-2 font-semibold">
          <Compass className="h-6 w-6 text-brand" />
          <span className="text-lg">Roamio</span>
        </Link>
        <DashboardNavLinks variant="sidebar" />
        <div className="mt-auto border-t pt-3">
          <div className="mb-2 px-2">
            <p className="truncate text-sm font-medium">
              {profile?.full_name ?? user.email}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Content */}
      <main className="px-4 pb-24 pt-4 sm:px-6 lg:pb-10 lg:pl-[16.5rem] lg:pr-8 lg:pt-8">
        {children}
      </main>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background/95 backdrop-blur lg:hidden">
        <DashboardNavLinks variant="bottom" />
      </nav>
    </div>
  );
}
