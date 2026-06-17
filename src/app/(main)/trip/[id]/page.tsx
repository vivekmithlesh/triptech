import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getTripById } from "@/lib/actions/trips";
import { requireUser } from "@/lib/auth";
import { TripPlanner } from "@/components/trip/TripPlanner";

export const metadata: Metadata = {
  title: "Trip planner",
  robots: { index: false },
};

export default async function TripPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const trip = await getTripById(params.id);

  // Only the owner can edit a trip here (public viewing lives at /t/[slug]).
  if (!trip || trip.user_id !== user.id) notFound();

  return <TripPlanner trip={trip} />;
}
