import type { Metadata } from "next";

import { JournalScreen } from "@/components/journal/JournalScreen";

export const metadata: Metadata = {
  title: "Journal",
  description: "Your travel memories — an auto timeline of trips and moments.",
};

export default function JournalPage() {
  return <JournalScreen variant="page" />;
}
