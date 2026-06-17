// Per-day route/marker colours, shared by the trip map, planner, and public
// itinerary page. Plain module (no "use client") so server components can call it.
export const DAY_COLORS = [
  "#0F9E75",
  "#378ADD",
  "#E9A23B",
  "#D9534F",
  "#7A5CC0",
  "#0F6E56",
  "#C07A2B",
  "#2BB3C0",
];

export function dayColor(day: number): string {
  return DAY_COLORS[(day - 1) % DAY_COLORS.length];
}
