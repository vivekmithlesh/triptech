import type { Metadata } from "next";
import { Bell } from "lucide-react";

import { getMyAlerts } from "@/lib/actions/alerts";
import type { AlertType } from "@/types/database";
import {
  CreateAlertForm,
  DeleteAlertButton,
} from "@/components/dashboard/AlertControls";

export const metadata: Metadata = { title: "Alerts" };

const TYPE_LABEL: Record<AlertType, string> = {
  festival: "Festival nearby",
  best_time: "Best time to visit",
  price_drop: "Price drop",
};

export default async function AlertsPage() {
  const alerts = await getMyAlerts().catch(() => []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Alerts</h1>
        <p className="text-sm text-muted-foreground">
          Get notified about festivals and the best time to visit places you
          care about.
        </p>
      </header>

      <CreateAlertForm />

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-10 text-center">
          <Bell className="h-6 w-6 text-muted-foreground" />
          <p className="font-medium">No alerts yet</p>
          <p className="text-sm text-muted-foreground">
            Add a destination above to start watching it.
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-2xl border bg-card">
          {alerts.map((a) => {
            const destination =
              (a.filters as { destination?: string } | null)?.destination ??
              "Anywhere";
            return (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-light text-brand">
                    <Bell className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-medium">{TYPE_LABEL[a.type]}</p>
                    <p className="text-sm text-muted-foreground">{destination}</p>
                  </div>
                </div>
                <DeleteAlertButton id={a.id} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
