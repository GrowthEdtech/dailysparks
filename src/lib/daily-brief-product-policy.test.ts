import { describe, expect, test } from "vitest";

import {
  getDailyBriefProgrammeContentModel,
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
});
