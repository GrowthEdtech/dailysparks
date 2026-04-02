import { describe, expect, test } from "vitest";

import {
  DAILY_SPARKS_SOURCE_WHITELIST_V1,
  DAILY_SPARKS_REPETITION_POLICY,
  getEditorialProgrammeProfile,
  getRecommendedSourcesForProgramme,
} from "./editorial-policy";

describe("editorial policy foundation", () => {
  test("defines the approved Daily Sparks source whitelist v1", () => {
    expect(DAILY_SPARKS_SOURCE_WHITELIST_V1.map((source) => source.id)).toEqual([
      "reuters",
      "ap",
      "bbc",
      "npr",
      "science-news",
      "science-news-explores",
      "unicef",
      "who",
      "national-geographic",
      "smithsonian-magazine",
    ]);
  });

  test("returns programme-specific editorial profiles and recommended sources", () => {
    expect(getEditorialProgrammeProfile("PYP").readingMode).toBe("curiosity-led");
    expect(getEditorialProgrammeProfile("MYP").readingMode).toBe("analysis-led");
    expect(getEditorialProgrammeProfile("DP").readingMode).toBe("argument-led");

    expect(getRecommendedSourcesForProgramme("PYP").map((source) => source.id)).toEqual([
      "science-news-explores",
      "unicef",
      "national-geographic",
      "bbc",
      "npr",
    ]);

    expect(getRecommendedSourcesForProgramme("MYP").map((source) => source.id)).toEqual([
      "reuters",
      "ap",
      "bbc",
      "npr",
      "science-news",
      "unicef",
      "who",
    ]);

    expect(getRecommendedSourcesForProgramme("DP").map((source) => source.id)).toEqual([
      "reuters",
      "ap",
      "bbc",
      "npr",
      "science-news",
      "smithsonian-magazine",
      "who",
    ]);
  });

  test("publishes repetition controls that protect a daily-paper reading rhythm", () => {
    expect(DAILY_SPARKS_REPETITION_POLICY.sourceReuse).toEqual({
      windowDays: 7,
      maxUsesPerSource: 2,
    });
    expect(DAILY_SPARKS_REPETITION_POLICY.topicReuse).toEqual({
      windowDays: 14,
      maxSelectionsPerCluster: 1,
    });
    expect(DAILY_SPARKS_REPETITION_POLICY.angleReuse).toEqual({
      windowDays: 14,
      maxReusesPerAngle: 1,
    });
    expect(DAILY_SPARKS_REPETITION_POLICY.questionTemplateReuse).toEqual({
      windowDays: 30,
      maxReusesPerTemplate: 1,
    });
  });
});
