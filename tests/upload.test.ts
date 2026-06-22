import { describe, expect, it } from "vitest";

import {
  MAX_IMAGE_BYTES,
  MAX_PHOTOS_PER_ENTRY,
  buildJournalPhotoPath,
  sanitizeFilename,
  validateImageFile,
  validateImageFiles,
} from "@/lib/upload";

const img = (over: Partial<{ name: string; type: string; size: number }> = {}) => ({
  name: "photo.jpg",
  type: "image/jpeg",
  size: 1024,
  ...over,
});

describe("validateImageFile", () => {
  it("accepts a small JPEG/PNG/WebP/GIF", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "image/gif"]) {
      expect(validateImageFile(img({ type })).ok).toBe(true);
    }
  });

  it("rejects a non-image MIME type", () => {
    const r = validateImageFile(img({ type: "application/pdf", name: "x.pdf" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/not a supported image/i);
  });

  it("rejects an oversized file", () => {
    const r = validateImageFile(img({ size: MAX_IMAGE_BYTES + 1 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/too large/i);
  });

  it("rejects an empty file", () => {
    const r = validateImageFile(img({ size: 0 }));
    expect(r.ok).toBe(false);
  });
});

describe("validateImageFiles", () => {
  it("rejects more than the per-entry photo limit", () => {
    const many = Array.from({ length: MAX_PHOTOS_PER_ENTRY + 1 }, () => img());
    const r = validateImageFiles(many);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(new RegExp(`${MAX_PHOTOS_PER_ENTRY}`));
  });

  it("returns the first per-file error in a batch", () => {
    const r = validateImageFiles([img(), img({ type: "text/plain", name: "bad.txt" })]);
    expect(r.ok).toBe(false);
  });

  it("accepts a valid batch", () => {
    expect(validateImageFiles([img(), img()]).ok).toBe(true);
  });
});

describe("sanitizeFilename", () => {
  it("lowercases, hyphenates, and preserves the extension", () => {
    expect(sanitizeFilename("My Vacation Pic.PNG")).toBe("my-vacation-pic.png");
  });

  it("strips path traversal and unsafe characters", () => {
    const s = sanitizeFilename("../../etc/passwd.jpg");
    expect(s).not.toContain("/");
    expect(s).not.toContain("..");
    expect(s.endsWith(".jpg")).toBe(true);
  });

  it("falls back to a default base and extension", () => {
    expect(sanitizeFilename("###")).toBe("photo.jpg");
  });
});

describe("buildJournalPhotoPath", () => {
  const userId = "11111111-1111-1111-1111-111111111111";

  it("always puts the user id as the first path segment", () => {
    const path = buildJournalPhotoPath(userId, "sunset.jpg");
    expect(path.split("/")[0]).toBe(userId);
  });

  it("cannot be tricked into another folder via a malicious filename", () => {
    const path = buildJournalPhotoPath(userId, "../../22222222/evil.png");
    // Exactly two segments: <userId>/<sanitized-file>. No way to escape the folder.
    expect(path.split("/")).toHaveLength(2);
    expect(path.split("/")[0]).toBe(userId);
  });

  it("produces unique paths for the same filename", () => {
    expect(buildJournalPhotoPath(userId, "a.jpg")).not.toBe(
      buildJournalPhotoPath(userId, "a.jpg")
    );
  });
});
