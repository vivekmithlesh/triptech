import type { Metadata } from "next";

import { getFestivals } from "@/lib/actions/festivals";
import { getUser } from "@/lib/auth";
import { FestivalsView } from "@/components/festivals/FestivalsView";

export const metadata: Metadata = {
  title: "Festivals",
  description:
    "A live calendar of world festivals on a map — find when and where, then plan a trip around it.",
};

export default async function FestivalsPage() {
  const [festivals, user] = await Promise.all([
    getFestivals().catch(() => []),
    getUser(),
  ]);

  return <FestivalsView festivals={festivals} loggedIn={!!user} />;
}
