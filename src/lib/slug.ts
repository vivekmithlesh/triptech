/**
 * URL-safe slug from a title + a short random suffix for uniqueness.
 * Extracted so it can be unit-tested and reused (used by trip sharing).
 */
export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "trip"}-${suffix}`;
}
