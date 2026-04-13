import { describe, expect, test } from "vitest";

import {
  buildDailyBriefRuntimeContract,
  getDailyBriefProgrammeContentModel,
  getDailyBriefProgrammeWelcomeFocus,
  getWeekendDeliveryPolicy,
} from "./daily-brief-product-policy";

describe("daily brief product policy", () => {
  test("returns a bridge-tier content model for MYP", () => {
    const model = getDailyBriefProgrammeContentModel("MYP");

    expect(model.layoutVariant).toBe("myp-bridge");
    expect(model.summaryTitle).toBe("Bridge brief");
    expect(model.readingTitle).toBe("Context and comparison");
    expect(model.discussionFallbackTitle).toBe("Inquiry question");
    expect(model.bigIdeaFallbackTitle).toBe("Notebook prompt");
    expect(model.knowledgeBankTitle).toBe("Inquiry notebook");
  });

  test("returns an academic-tier content model for DP", () => {
    const model = getDailyBriefProgrammeContentModel("DP");

    expect(model.layoutVariant).toBe("dp-academic");
    expect(model.summaryTitle).toBe("3-sentence abstract");
    expect(model.readingTitle).toBe("Academic frame");
    expect(model.discussionFallbackTitle).toBe("TOK / essay prompt");
    expect(model.bigIdeaFallbackTitle).toBe("Notebook capture");
    expect(model.knowledgeBankTitle).toBe("Academic idea bank");
  });

  test("returns distinct welcome-note focus metadata for MYP and DP", () => {
    const mypFocus = getDailyBriefProgrammeWelcomeFocus("MYP");
    const dpFocus = getDailyBriefProgrammeWelcomeFocus("DP");

    expect(mypFocus.programmeBadge).toBe("MYP · Bridge tier");
    expect(mypFocus.focusPoints).toEqual([
      "Global context connections",
      "Compare-or-connect thinking",
      "Inquiry notebook captures",
    ]);

    expect(dpFocus.programmeBadge).toBe("DP · Academic tier");
    expect(dpFocus.focusPoints).toEqual([
      "Abstract and core issue framing",
      "Claim and counterpoint thinking",
      "TOK and essay notebook capture",
    ]);
  });

  test("uses vision-day framing for MYP weekends and TOK-day framing for DP weekends", () => {
    const mypWeekend = getWeekendDeliveryPolicy("MYP", "2026-04-05");
    const dpWeekend = getWeekendDeliveryPolicy("DP", "2026-04-05");

    expect(mypWeekend.mode).toBe("weekend-vision");
    expect(mypWeekend.label).toBe("Vision day");
    expect(mypWeekend.promptNote).toMatch(/global culture|future|cross-disciplinary/i);

    expect(dpWeekend.mode).toBe("weekend-tok");
    expect(dpWeekend.label).toBe("TOK day");
    expect(dpWeekend.promptNote).toMatch(/ethic|knowledge|interdisciplinary/i);
  });

  test("builds a programme-native runtime contract overlay for legacy prompt policies", () => {
    const mypContract = buildDailyBriefRuntimeContract("MYP", "2026-04-05");
    const dpContract = buildDailyBriefRuntimeContract("DP", "2026-04-05");

    expect(mypContract).toContain("Runtime contract overlay");
    expect(mypContract).toContain(
      "Use this exact section order: Learning objective -> What's happening? -> Why does this matter? -> Global context -> Compare or connect -> Key / related concepts -> Words to know -> Inquiry question -> Notebook prompt.",
    );
    expect(mypContract).toContain("Vision day");
    expect(mypContract).toContain("Global context must connect the story");
    expect(mypContract).toContain("Inquiry question should invite compare, explain, predict, or connect thinking.");

    expect(dpContract).toContain("Runtime contract overlay");
    expect(dpContract).toContain(
      "Use this exact section order: 3-sentence abstract -> Learning objective -> Core issue -> Claim -> Counterpoint or evidence limit -> Method focus -> TOK link -> Why this matters for IB thinking -> Key academic term -> TOK / essay prompt -> Researchable question -> Notebook capture.",
    );
    expect(dpContract).toContain("TOK day");
    expect(dpContract).toContain("Claim must make a defensible interpretation");
    expect(dpContract).toContain("Notebook capture must store one reusable academic idea or tension.");
  });
});
