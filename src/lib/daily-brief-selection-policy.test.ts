import { describe, expect, test } from "vitest";

import { selectTopicWithPolicy } from "./daily-brief-selection-policy";
import type { EditorialSourceCandidate } from "./source-ingestion";

function buildCandidate(
  title: string,
  summary: string,
  overrides: Partial<EditorialSourceCandidate> = {},
): EditorialSourceCandidate {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return {
    id: `source:${slug}`,
    sourceId: overrides.sourceId ?? "bbc",
    sourceName: overrides.sourceName ?? "BBC",
    sourceDomain: overrides.sourceDomain ?? "bbc.com",
    feedUrl: overrides.feedUrl ?? "https://feeds.bbci.co.uk/news/world/rss.xml",
    section: overrides.section ?? "world",
    title,
    summary,
    url: overrides.url ?? `https://www.bbc.com/news/${slug}`,
    normalizedUrl:
      overrides.normalizedUrl ?? `https://www.bbc.com/news/${slug}`,
    normalizedTitle: overrides.normalizedTitle ?? title.toLowerCase(),
    publishedAt: overrides.publishedAt ?? "2026-04-10T08:00:00.000Z",
    ingestionMode: overrides.ingestionMode ?? "metadata-only",
    fetchedAt: overrides.fetchedAt ?? "2026-04-10T08:05:00.000Z",
  };
}

describe("daily brief selection policy", () => {
  test("keeps the base ranked topic on weekdays when weekend policy is inactive", () => {
    const decision = selectTopicWithPolicy({
      candidates: [
        buildCandidate(
          "City budget update challenges local councils",
          "A standard public policy article without a special weekend framing.",
        ),
        buildCandidate(
          "Young inventors imagine future floating classrooms",
          "Students explore future-facing design ideas for global learning communities.",
        ),
      ],
      eligibleProgrammes: ["MYP"],
      historyEntries: [],
      scheduledFor: "2026-04-10",
      editorialCohort: "APAC",
      recordKind: "production",
      topicReuseWindowDays: 7,
    });

    expect(decision.topic?.headline).toBe(
      "City budget update challenges local councils",
    );
  });

  test("biases weekend ranking toward Vision day topics for MYP", () => {
    const decision = selectTopicWithPolicy({
      candidates: [
        buildCandidate(
          "City budget update challenges local councils",
          "A standard public policy article without a special weekend framing.",
        ),
        buildCandidate(
          "Young inventors imagine future floating classrooms",
          "Students explore future-facing design ideas for global learning communities.",
        ),
      ],
      eligibleProgrammes: ["MYP"],
      historyEntries: [],
      scheduledFor: "2026-04-12",
      editorialCohort: "APAC",
      recordKind: "production",
      topicReuseWindowDays: 7,
    });

    expect(decision.topic?.headline).toBe(
      "Young inventors imagine future floating classrooms",
    );
  });

  test("biases weekend ranking toward TOK day topics for DP", () => {
    const decision = selectTopicWithPolicy({
      candidates: [
        buildCandidate(
          "City budget update challenges local councils",
          "A standard public policy article without a special weekend framing.",
        ),
        buildCandidate(
          "Should AI evidence guide court decisions?",
          "An ethics-rich debate about knowledge limits, fairness, and evidence in public reasoning.",
        ),
      ],
      eligibleProgrammes: ["DP"],
      historyEntries: [],
      scheduledFor: "2026-04-12",
      editorialCohort: "APAC",
      recordKind: "production",
      topicReuseWindowDays: 7,
    });

    expect(decision.topic?.headline).toBe(
      "Should AI evidence guide court decisions?",
    );
  });

  test("prefers a shared weekend topic when MYP and DP are both active", () => {
    const decision = selectTopicWithPolicy({
      candidates: [
        buildCandidate(
          "City budget update challenges local councils",
          "A standard public policy article without a special weekend framing.",
        ),
        buildCandidate(
          "Young inventors imagine future floating classrooms",
          "Students explore future-facing design ideas for global learning communities.",
        ),
        buildCandidate(
          "How should future cities use AI fairly across cultures?",
          "A cross-disciplinary debate that combines future technology, fairness, evidence limits, and global cultural trade-offs.",
        ),
      ],
      eligibleProgrammes: ["MYP", "DP"],
      historyEntries: [],
      scheduledFor: "2026-04-12",
      editorialCohort: "APAC",
      recordKind: "production",
      topicReuseWindowDays: 7,
    });

    expect(decision.topic?.headline).toBe(
      "How should future cities use AI fairly across cultures?",
    );
  });
});
