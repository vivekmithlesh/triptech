import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { Compass } from "lucide-react";

import { requireUser, getProfile } from "@/lib/auth";
import { UserMenu } from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Dashboard · Roamio",
};

// NOTE: minimal placeholder. Brick 11 replaces this with the full dashboard
// (stat cards, upcoming trips, saved places, journal). It already reads REAL
// data — the signed-in user and their profile row — so it verifies Brick 04.
export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await getProfile();

  const preferences = (profile?.preferences ?? {}) as {
    interests?: string[];
    travel_style?: string;
  };
  const interests = preferences.interests ?? [];

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Compass className="h-5 w-5 text-primary" />
            Roamio
          </Link>
          <UserMenu
            email={user.email ?? ""}
            fullName={profile?.full_name}
            avatarUrl={profile?.avatar_url}
          />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            You&apos;re signed in. The full dashboard arrives in a later brick.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>TripCoins</CardDescription>
              <CardTitle className="text-3xl">{profile?.tripcoins ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Home currency</CardDescription>
              <CardTitle className="text-3xl">
                {profile?.home_currency ?? "INR"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Member since</CardDescription>
              <CardTitle className="text-3xl">
                {profile?.created_at
                  ? format(new Date(profile.created_at), "MMM yyyy")
                  : "—"}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your account</CardTitle>
            <CardDescription>Captured at sign-up — real data from Supabase.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Name" value={profile?.full_name ?? "—"} />
            <Row label="Email" value={user.email ?? "—"} />
            <Row
              label="Travel style"
              value={
                preferences.travel_style
                  ? preferences.travel_style[0]!.toUpperCase() +
                    preferences.travel_style.slice(1)
                  : "—"
              }
            />
            <div className="flex items-start justify-between gap-4">
              <span className="text-muted-foreground">Interests</span>
              <div className="flex flex-wrap justify-end gap-1.5">
                {interests.length > 0 ? (
                  interests.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span>—</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/">Explore</Link>
          </Button>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
