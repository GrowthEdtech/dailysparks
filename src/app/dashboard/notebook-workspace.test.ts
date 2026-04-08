import { describe, expect, test } from "vitest";

import type { DailyBriefNotebookEntryRecord } from "../../lib/daily-brief-notebook-store";
import {
  ALL_NOTEBOOK_FILTER_ID,
  buildNotebookEntryPreview,
  buildNotebookFilterOptions,
  filterNotebookEntries,
  resolveSelectedNotebookEntry,
} from "./notebook-workspace";

const entries: DailyBriefNotebookEntryRecord[] = [
  {
    id: "entry-1",
    parentId: "parent-1",
    parentEmail: "parent@example.com",
    studentId: "student-1",
    programme: "MYP",
    entryType: "inquiry-notebook",
    title: "Inquiry notebook",
    body: "Which cleanup plan would feel fairest, and what evidence would help you defend that choice?",
    knowledgeBankTitle: "Inquiry notebook",
    sourceBriefId: "brief-1",
    sourceScheduledFor: "2026-04-08",
    sourceHeadline: "Students compare coastal cleanup plans",
    topicTags: ["civic planning", "sustainability"],
    interestTags: ["Tech & Innovation"],
    savedSource: "dashboard",
    savedAt: "2026-04-08T01:00:00.000Z",
    createdAt: "2026-04-08T01:00:00.000Z",
  },
  {
    id: "entry-2",
    parentId: "parent-1",
    parentEmail: "parent@example.com",
    studentId: "student-1",
    programme: "MYP",
    entryType: "global-context-note",
    title: "Global context note",
    body: "Coastal cleanup decisions affect communities, public budgets, and environmental recovery.",
    knowledgeBankTitle: "Inquiry notebook",
    sourceBriefId: "brief-1",
    sourceScheduledFor: "2026-04-08",
    sourceHeadline: "Students compare coastal cleanup plans",
    topicTags: ["civic planning", "sustainability"],
    interestTags: ["Tech & Innovation"],
    savedSource: "dashboard",
    savedAt: "2026-04-08T01:00:00.000Z",
    createdAt: "2026-04-08T01:00:00.000Z",
  },
  {
    id: "entry-3",
    parentId: "parent-1",
    parentEmail: "parent@example.com",
    studentId: "student-1",
    programme: "DP",
    entryType: "tok-prompt",
    title: "TOK prompt",
    body: "When evidence is incomplete, how should societies decide whether caution is wiser than freedom to experiment?",
    knowledgeBankTitle: "Academic idea bank",
    sourceBriefId: "brief-2",
    sourceScheduledFor: "2026-04-09",
    sourceHeadline: "Governments debate whether AI regulation can keep up",
    topicTags: ["AI", "Ethics"],
    interestTags: ["TOK"],
    savedSource: "dashboard",
    savedAt: "2026-04-09T01:00:00.000Z",
    createdAt: "2026-04-09T01:00:00.000Z",
  },
];

describe("notebook workspace helpers", () => {
  test("builds filter options from the entry types present in the notebook", () => {
    expect(buildNotebookFilterOptions(entries)).toEqual([
      {
        id: ALL_NOTEBOOK_FILTER_ID,
        label: "All notes",
        count: 3,
      },
      {
        id: "inquiry-notebook",
        label: "Inquiry",
        count: 1,
      },
      {
        id: "global-context-note",
        label: "Global context",
        count: 1,
      },
      {
        id: "tok-prompt",
        label: "TOK prompt",
        count: 1,
      },
    ]);
  });

  test("filters entries by entry type and falls back to all notes", () => {
    expect(filterNotebookEntries(entries, "global-context-note").map((entry) => entry.id)).toEqual([
      "entry-2",
    ]);
    expect(filterNotebookEntries(entries, ALL_NOTEBOOK_FILTER_ID).map((entry) => entry.id)).toEqual([
      "entry-1",
      "entry-2",
      "entry-3",
    ]);
  });

  test("resolves the selected entry inside the current filtered set", () => {
    const filtered = filterNotebookEntries(entries, "tok-prompt");

    expect(resolveSelectedNotebookEntry(filtered, null)?.id).toBe("entry-3");
    expect(resolveSelectedNotebookEntry(filtered, "missing")?.id).toBe("entry-3");
    expect(resolveSelectedNotebookEntry(filtered, "entry-3")?.id).toBe("entry-3");
  });

  test("builds a compact preview for notebook list rows", () => {
    expect(buildNotebookEntryPreview(entries[0]!)).toContain("Which cleanup plan");
    expect(buildNotebookEntryPreview(entries[0]!)).toBe(
      "Which cleanup plan would feel fairest, and what evidence would help you defend that choice?",
    );
  });
});
