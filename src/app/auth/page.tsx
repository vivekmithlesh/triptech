import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Compass, MapPin, Sparkles } from "lucide-react";

import { getUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Sign in · Roamio",
  description: "Log in or create your Roamio account to plan AI-powered trips.",
};

const HIGHLIGHTS = [
  {
    icon: Sparkles,
    title: "Your AI travel companion",
    body: "Tell it where you're going — it builds the optimal day-by-day trip.",
  },
  {
    icon: MapPin,
    title: "Real places, real maps",
    body: "Discover cafes, monuments and viewpoints on an interactive map.",
  },
  {
    icon: Compass,
    title: "Travel like a local",
    body: "Grounded history and arrival briefs the moment you land.",
  },
];

export default async function AuthPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const user = await getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand / marketing panel (hidden on mobile) */}
      <section
        className="relative hidden flex-col justify-between p-12 text-white lg:flex"
        style={{
          background:
            "linear-gradient(160deg, #13343B 0%, #0F6E56 55%, #0F9E75 100%)",
        }}
      >
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Compass className="h-6 w-6" />
          Roamio
        </div>

        <div className="space-y-8">
          <h2 className="max-w-sm text-3xl font-semibold leading-tight">
            Travel the world with an AI in your pocket.
          </h2>
          <ul className="space-y-5">
            {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-white/80">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-white/70">
          Drop a destination. Get a smart trip on a map.
        </p>
      </section>

      {/* Auth form panel */}
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <AuthForm initialError={searchParams.error} />
        </div>
      </section>
    </main>
  );
}
