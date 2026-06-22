import { describe, expect, it } from "vitest";

import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates a title, with a random suffix", () => {
    const s = slugify("Goa Beach Trip 2026");
    expect(s).toMatch(/^goa-beach-trip-2026-[a-z0-9]{4,8}$/);
  });

  it("collapses runs of symbols/spaces into single hyphens", () => {
    expect(slugify("Hello   ---  World!!!")).toMatch(/^hello-world-[a-z0-9]+$/);
  });

  it("falls back to 'trip' when the title has no usable characters", () => {
    expect(slugify("@@@ !!!")).toMatch(/^trip-[a-z0-9]+$/);
    expect(slugify("")).toMatch(/^trip-[a-z0-9]+$/);
  });

  it("clamps the base to 40 chars before the suffix", () => {
    const long = "a".repeat(100);
    const s = slugify(long);
    const base = s.slice(0, s.lastIndexOf("-"));
    expect(base.length).toBeLessThanOrEqual(40);
  });

  it("produces a different suffix on repeated calls (uniqueness)", () => {
    expect(slugify("Same Title")).not.toBe(slugify("Same Title"));
  });
});
