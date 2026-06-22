/**
 * Journal photo upload rules — shared by the client uploader
 * (src/components/journal/AddMemoryDialog.tsx) and the unit tests. The Storage
 * bucket also enforces these server-side (size + MIME), and Storage RLS enforces
 * the per-user folder (migrations/0001) — this module is the first line of
 * defence + good UX, never the only one.
 */

export const JOURNAL_PHOTO_BUCKET = "journal-photos";

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MiB (matches bucket limit)
export const MAX_PHOTOS_PER_ENTRY = 4;

export interface ValidatableFile {
  name: string;
  type: string;
  size: number;
}

export type ValidationResult = { ok: true } | { ok: false; error: string };

/** Validates a single file's MIME type and size before upload. */
export function validateImageFile(file: ValidatableFile): ValidationResult {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return {
      ok: false,
      error: `"${file.name}" is not a supported image. Use JPEG, PNG, WebP, or GIF.`,
    };
  }
  if (file.size <= 0) {
    return { ok: false, error: `"${file.name}" is empty.` };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = Math.round(MAX_IMAGE_BYTES / 1024 / 1024);
    return { ok: false, error: `"${file.name}" is too large. Max ${mb}MB per photo.` };
  }
  return { ok: true };
}

/** Validates a batch, returning the first error (or ok). */
export function validateImageFiles(files: ValidatableFile[]): ValidationResult {
  if (files.length > MAX_PHOTOS_PER_ENTRY) {
    return {
      ok: false,
      error: `Up to ${MAX_PHOTOS_PER_ENTRY} photos per memory.`,
    };
  }
  for (const f of files) {
    const r = validateImageFile(f);
    if (!r.ok) return r;
  }
  return { ok: true };
}

/** Lowercases, strips unsafe chars, and clamps a filename. */
export function sanitizeFilename(name: string): string {
  const dot = name.lastIndexOf(".");
  const rawExt = dot >= 0 ? name.slice(dot + 1) : "";
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
  const rawBase = dot >= 0 ? name.slice(0, dot) : name;
  const base =
    rawBase
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "photo";
  return `${base}.${ext}`;
}

/**
 * Builds the Storage object path. The FIRST segment is always the user's id;
 * Storage RLS (migrations/0001) rejects any path whose first folder != auth.uid().
 */
export function buildJournalPhotoPath(userId: string, filename: string): string {
  const safe = sanitizeFilename(filename);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${userId}/${Date.now()}-${rand}-${safe}`;
}
