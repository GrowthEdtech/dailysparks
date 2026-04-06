import { describe, expect, test } from "vitest";

import {
  GEO_CONTENT_PAGE_STRUCTURE_SUGGESTIONS,
  GEO_WEBSITE_DERIVED_PROMPT_SEEDS,
} from "./geo-website-derived-prompts";

describe("geo-website-derived-prompts", () => {
  test("defines the first batch of website-derived GEO prompt seeds", () => {
    expect(GEO_WEBSITE_DERIVED_PROMPT_SEEDS).toHaveLength(8);
    expect(
      GEO_WEBSITE_DERIVED_PROMPT_SEEDS.some((prompt) =>
        /IB reading workflow for families/i.test(prompt.prompt),
      ),
    ).toBe(true);
    expect(
      GEO_WEBSITE_DERIVED_PROMPT_SEEDS.every((prompt) => prompt.active),
    ).toBe(true);
    expect(
      GEO_WEBSITE_DERIVED_PROMPT_SEEDS.every(
        (prompt) =>
          prompt.engineCoverage.length === 1 &&
          prompt.engineCoverage[0] === "chatgpt-search",
      ),
    ).toBe(true);
  });

  test("defines content page structure suggestions anchored to current site themes", () => {
    expect(GEO_CONTENT_PAGE_STRUCTURE_SUGGESTIONS.length).toBeGreaterThanOrEqual(3);
    expect(
      GEO_CONTENT_PAGE_STRUCTURE_SUGGESTIONS[0]?.recommendedSlug,
    ).toContain("goodnotes");
    expect(
      GEO_CONTENT_PAGE_STRUCTURE_SUGGESTIONS[0]?.sections.length,
    ).toBeGreaterThanOrEqual(4);
  });
});
