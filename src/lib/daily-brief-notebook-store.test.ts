import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  listDailyBriefNotebookEntries,
  saveDailyBriefNotebookAuthoredEntry,
  saveDailyBriefNotebookEntries,
} from "./daily-brief-notebook-store";

const ORIGINAL_ENV = { ...process.env };
let tempDirectory = "";

beforeEach(async () => {
  tempDirectory = await mkdtemp(path.join(tmpdir(), "daily-sparks-notebook-"));
  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_DAILY_BRIEF_NOTEBOOK_STORE_PATH: path.join(
      tempDirectory,
      "daily-brief-notebook.json",
    ),
  };
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("daily brief notebook store", () => {
  test("persists structured notebook entries and dedupes repeated saves from the same brief", async () => {
    const firstSave = await saveDailyBriefNotebookEntries({
      parentId: "parent-1",
      parentEmail: "parent@example.com",
      studentId: "student-1",
      programme: "MYP",
      interestTags: ["Tech & Innovation", "Society & Culture"],
      briefId: "brief-1",
      scheduledFor: "2026-04-08",
      headline: "Students compare city cleanup plans",
      topicTags: ["civic planning", "sustainability"],
      knowledgeBankTitle: "Inquiry notebook",
      entries: [
        {
          title: "Inquiry notebook",
          body: "Which plan feels fairest, and why?",
        },
        {
          title: "Global context note",
          body: "Cities balance cost, trust, and environmental repair.",
        },
      ],
    });

    expect(firstSave.savedEntries).toHaveLength(2);
    expect(firstSave.dedupedEntries).toHaveLength(0);

    const secondSave = await saveDailyBriefNotebookEntries({
      parentId: "parent-1",
      parentEmail: "parent@example.com",
      studentId: "student-1",
      programme: "MYP",
      interestTags: ["Tech & Innovation", "Society & Culture"],
      briefId: "brief-1",
      scheduledFor: "2026-04-08",
      headline: "Students compare city cleanup plans",
      topicTags: ["civic planning", "sustainability"],
      knowledgeBankTitle: "Inquiry notebook",
      entries: [
        {
          title: "Inquiry notebook",
          body: "Which plan feels fairest, and why?",
        },
        {
          title: "Global context note",
          body: "Cities balance cost, trust, and environmental repair.",
        },
      ],
    });

    expect(secondSave.savedEntries).toHaveLength(0);
    expect(secondSave.dedupedEntries).toHaveLength(2);

    const entries = await listDailyBriefNotebookEntries({
      parentId: "parent-1",
    });

    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.entryType)).toEqual([
      "inquiry-notebook",
      "global-context-note",
    ]);
    expect(entries[0]).toEqual(
      expect.objectContaining({
        sourceBriefId: "brief-1",
        sourceHeadline: "Students compare city cleanup plans",
        programme: "MYP",
        knowledgeBankTitle: "Inquiry notebook",
        sourceScheduledFor: "2026-04-08",
        savedAt: "2026-04-08T00:00:00.000Z",
        createdAt: "2026-04-08T00:00:00.000Z",
        updatedAt: "2026-04-08T00:00:00.000Z",
      }),
    );
  });

  test("upserts a user-authored notebook entry for the same brief and entry type", async () => {
    const firstSave = await saveDailyBriefNotebookAuthoredEntry({
      parentId: "parent-1",
      parentEmail: "parent@example.com",
      studentId: "student-1",
      programme: "DP",
      interestTags: ["TOK", "Philosophy"],
      briefId: "brief-2",
      scheduledFor: "2026-04-09",
      headline: "Governments debate whether AI regulation can keep up",
      topicTags: ["AI", "Ethics"],
      knowledgeBankTitle: "Academic idea bank",
      entryType: "tok-prompt",
      body: "I think incomplete evidence makes this a strong TOK case because certainty is exactly what's missing.",
    });

    expect(firstSave.wasUpdate).toBe(false);
    expect(firstSave.entry).toEqual(
      expect.objectContaining({
        programme: "DP",
        entryType: "tok-prompt",
        title: "TOK prompt",
        savedSource: "reflection",
        entryOrigin: "authored",
      }),
    );

    const secondSave = await saveDailyBriefNotebookAuthoredEntry({
      parentId: "parent-1",
      parentEmail: "parent@example.com",
      studentId: "student-1",
      programme: "DP",
      interestTags: ["TOK", "Philosophy"],
      briefId: "brief-2",
      scheduledFor: "2026-04-09",
      headline: "Governments debate whether AI regulation can keep up",
      topicTags: ["AI", "Ethics"],
      knowledgeBankTitle: "Academic idea bank",
      entryType: "tok-prompt",
      body: "I would compare precaution with freedom to experiment before deciding which response is more justified.",
    });

    expect(secondSave.wasUpdate).toBe(true);
    expect(secondSave.entry.body).toContain("precaution");

    const entries = await listDailyBriefNotebookEntries({
      parentId: "parent-1",
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual(
      expect.objectContaining({
        entryOrigin: "authored",
        entryType: "tok-prompt",
        body: "I would compare precaution with freedom to experiment before deciding which response is more justified.",
      }),
    );
  });
});
