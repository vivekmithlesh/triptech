import type { Metadata } from "next";

import { JournalScreen } from "@/components/journal/JournalScreen";

export const metadata: Metadata = { title: "Journal" };

export default function DashboardJournalPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <JournalScreen variant="dashboard" />
    </div>
  );
}
