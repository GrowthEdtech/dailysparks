import { describe, expect, test } from "vitest";

import type { DailyBriefNotebookEntryRecord } from "./daily-brief-notebook-store";
import { buildDailyBriefNotebookWeeklyRecap } from "./daily-brief-notebook-weekly-recap";

const entries: DailyBriefNotebookEntryRecord[] = [
  {
    id: "entry-1",
    parentId: "parent-1",
    parentEmail: "parent@example.com",
    studentId: "student-1",
    programme: "DP",
    entryType: "claim",
    entryOrigin: "system",
    title: "Claim",
    body: "Stronger regulation is justified when public harm can scale faster than oversight.",
    knowledgeBankTitle: "Academic idea bank",
    sourceBriefId: "brief-1",
    sourceScheduledFor: "2026-04-07",
    sourceHeadline: "Governments debate whether AI regulation can keep up",
    topicTags: ["AI", "Ethics"],
    interestTags: ["TOK", "Philosophy"],
    savedSource: "dashboard",
    savedAt: "2026-04-07T09:00:00.000Z",
    createdAt: "2026-04-07T09:00:00.000Z",
    updatedAt: "2026-04-07T09:00:00.000Z",
  },
  {
    id: "entry-2",
    parentId: "parent-1",
    parentEmail: "parent@example.com",
    studentId: "student-1",
    programme: "DP",
    entryType: "tok-prompt",
    entryOrigin: "authored",
    title: "TOK prompt",
    body: "I would compare precaution with freedom to experiment before deciding which response is more justified.",
    knowledgeBankTitle: "Academic idea bank",
    sourceBriefId: "brief-1",
    sourceScheduledFor: "2026-04-07",
    sourceHeadline: "Governments debate whether AI regulation can keep up",
    topicTags: ["AI", "Ethics"],
    interestTags: ["TOK", "Philosophy"],
    savedSource: "reflection",
    savedAt: "2026-04-07T10:00:00.000Z",
    createdAt: "2026-04-07T10:00:00.000Z",
    updatedAt: "2026-04-08T08:00:00.000Z",
  },
  {
    id: "entry-3",
    parentId: "parent-1",
    parentEmail: "parent@example.com",
    studentId: "student-1",
    programme: "DP",
    entryType: "counterpoint",
    entryOrigin: "system",
    title: "Counterpoint",
    body: "Regulation can overreach when the evidence base is still incomplete.",
    knowledgeBankTitle: "Academic idea bank",
    sourceBriefId: "brief-2",
    sourceScheduledFor: "2026-04-10",
    sourceHeadline: "Lawmakers debate precaution and innovation",
    topicTags: ["Policy", "Ethics"],
    interestTags: ["TOK"],
    savedSource: "dashboard",
    savedAt: "2026-04-10T08:00:00.000Z",
    createdAt: "2026-04-10T08:00:00.000Z",
    updatedAt: "2026-04-10T08:00:00.000Z",
  },
  {
    id: "entry-4",
    parentId: "parent-1",
    parentEmail: "parent@example.com",
    studentId: "student-1",
    programme: "DP",
    entryType: "claim",
    entryOrigin: "system",
    title: "Claim",
    body: "Older note outside the current week should not appear.",
    knowledgeBankTitle: "Academic idea bank",
    sourceBriefId: "brief-0",
    sourceScheduledFor: "2026-03-30",
    sourceHeadline: "Older headline",
    topicTags: ["History"],
    interestTags: ["History"],
    savedSource: "dashboard",
    savedAt: "2026-03-30T08:00:00.000Z",
    createdAt: "2026-03-30T08:00:00.000Z",
    updatedAt: "2026-03-30T08:00:00.000Z",
  },
];

describe("buildDailyBriefNotebookWeeklyRecap", () => {
  test("builds a weekly recap with summary metrics and retrieval prompts", () => {
    const recap = buildDailyBriefNotebookWeeklyRecap({
      entries,
      programme: "DP",
      asOf: "2026-04-10T12:00:00.000Z",
    });

    expect(recap).not.toBeNull();
    expect(recap).toEqual(
      expect.objectContaining({
        programme: "DP",
        totalEntries: 3,
        authoredCount: 1,
        systemCount: 2,
        weekKey: "2026-04-06",
      }),
    );
    expect(recap?.topTags).toEqual(["TOK", "AI", "Ethics"]);
    expect(recap?.entryTypeBreakdown).toEqual([
      { entryType: "claim", label: "Claim", count: 1 },
      { entryType: "counterpoint", label: "Counterpoint", count: 1 },
      { entryType: "tok-prompt", label: "TOK prompt", count: 1 },
    ]);
    expect(recap?.summaryLines).toEqual([
      "You captured 3 notebook entries this week, including 1 note in your own words.",
      "Your strongest focus areas were TOK, AI, and Ethics.",
      "This week leaned most on Claim, Counterpoint, and TOK prompt thinking.",
    ]);
    expect(recap?.retrievalPrompts).toHaveLength(3);
    expect(recap?.retrievalPrompts[0]).toEqual(
      expect.objectContaining({
        entryId: "entry-2",
        title: "TOK prompt",
      }),
    );
    expect(recap?.retrievalPrompts[0]?.prompt).toContain(
      "Has your answer to this TOK prompt shifted",
    );
  });

  test("returns null when there are no entries for the current programme in the week window", () => {
    const recap = buildDailyBriefNotebookWeeklyRecap({
      entries,
      programme: "MYP",
      asOf: "2026-04-10T12:00:00.000Z",
    });

    expect(recap).toBeNull();
  });

  test("uses Hong Kong week boundaries instead of raw UTC dates", () => {
    const recap = buildDailyBriefNotebookWeeklyRecap({
      entries: [
        {
          ...entries[0]!,
          id: "hk-entry-in-week",
          updatedAt: "2026-04-12T15:30:00.000Z",
          savedAt: "2026-04-12T15:30:00.000Z",
          createdAt: "2026-04-12T15:30:00.000Z",
        },
        {
          ...entries[1]!,
          id: "hk-entry-next-week",
          updatedAt: "2026-04-12T16:30:00.000Z",
          savedAt: "2026-04-12T16:30:00.000Z",
          createdAt: "2026-04-12T16:30:00.000Z",
        },
      ],
      programme: "DP",
      asOf: "2026-04-12T10:00:00.000Z",
    });

    expect(recap).not.toBeNull();
    expect(recap?.weekKey).toBe("2026-04-06");
    expect(recap?.totalEntries).toBe(1);
    expect(recap?.highlights).toEqual([
      expect.objectContaining({ entryId: "hk-entry-in-week" }),
    ]);
  });
});
