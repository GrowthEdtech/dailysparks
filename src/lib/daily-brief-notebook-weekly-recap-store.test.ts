import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  saveDailyBriefNotebookEntries,
} from "./daily-brief-notebook-store";
import {
  buildDailyBriefNotebookWeeklyRecap,
} from "./daily-brief-notebook-weekly-recap";
import {
  getDailyBriefNotebookWeeklyRecap,
  listDailyBriefNotebookWeeklyRecaps,
  saveDailyBriefNotebookWeeklyRecap,
  saveDailyBriefNotebookWeeklyRecapResponse,
} from "./daily-brief-notebook-weekly-recap-store";

const ORIGINAL_ENV = { ...process.env };
let tempDirectory = "";

beforeEach(async () => {
  tempDirectory = await mkdtemp(path.join(tmpdir(), "daily-sparks-weekly-recap-store-"));
  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_DAILY_BRIEF_NOTEBOOK_STORE_PATH: path.join(
      tempDirectory,
      "daily-brief-notebook.json",
    ),
    DAILY_SPARKS_DAILY_BRIEF_NOTEBOOK_WEEKLY_RECAP_STORE_PATH: path.join(
      tempDirectory,
      "daily-brief-notebook-weekly-recaps.json",
    ),
  };
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("daily brief notebook weekly recap store", () => {
  test("persists a weekly recap snapshot and updates retrieval responses in place", async () => {
    await saveDailyBriefNotebookEntries({
      parentId: "parent-1",
      parentEmail: "parent@example.com",
      studentId: "student-1",
      programme: "DP",
      interestTags: ["TOK", "Philosophy"],
      briefId: "brief-1",
      scheduledFor: "2026-04-07",
      headline: "Governments debate whether AI regulation can keep up",
      topicTags: ["AI", "Ethics"],
      knowledgeBankTitle: "Academic idea bank",
      entries: [
        {
          title: "Claim",
          body: "Stronger regulation is justified when public harm can scale faster than oversight.",
        },
        {
          title: "Counterpoint",
          body: "Regulation can overreach when the evidence base is still incomplete.",
        },
        {
          title: "TOK prompt",
          body: "When evidence is incomplete, how should societies decide whether caution is wiser than freedom to experiment?",
        },
      ],
    });

    const recap = buildDailyBriefNotebookWeeklyRecap({
      entries: await saveAndListEntries(),
      programme: "DP",
      asOf: "2026-04-10T12:00:00.000Z",
    });

    expect(recap).not.toBeNull();

    const firstSave = await saveDailyBriefNotebookWeeklyRecap({
      parentId: "parent-1",
      parentEmail: "parent@example.com",
      studentId: "student-1",
      programme: "DP",
      recap: recap!,
    });

    expect(firstSave.wasUpdate).toBe(false);
    expect(firstSave.record.retrievalResponses).toEqual([]);

    const responseSave = await saveDailyBriefNotebookWeeklyRecapResponse({
      parentId: "parent-1",
      programme: "DP",
      weekKey: recap!.weekKey,
      promptEntryId: recap!.retrievalPrompts[0]!.entryId,
      response:
        "I would still defend caution first, but I would now add a stronger case for iterative oversight.",
    });

    expect(responseSave.response.wasUpdate).toBe(false);
    expect(responseSave.record.retrievalResponses).toHaveLength(1);
    expect(responseSave.record.retrievalResponses[0]).toEqual(
      expect.objectContaining({
        promptEntryId: recap!.retrievalPrompts[0]!.entryId,
        response:
          "I would still defend caution first, but I would now add a stronger case for iterative oversight.",
      }),
    );

    const updatedResponse = await saveDailyBriefNotebookWeeklyRecapResponse({
      parentId: "parent-1",
      programme: "DP",
      weekKey: recap!.weekKey,
      promptEntryId: recap!.retrievalPrompts[0]!.entryId,
      response:
        "I would compare iterative oversight with outright restriction before deciding which position is strongest.",
    });

    expect(updatedResponse.response.wasUpdate).toBe(true);
    expect(updatedResponse.record.retrievalResponses).toHaveLength(1);
    expect(updatedResponse.record.retrievalResponses[0]?.response).toContain(
      "iterative oversight",
    );

    const persisted = await getDailyBriefNotebookWeeklyRecap({
      parentId: "parent-1",
      programme: "DP",
      weekKey: recap!.weekKey,
    });

    expect(persisted?.retrievalResponses).toHaveLength(1);
    expect(persisted?.retrievalResponses[0]?.response).toContain(
      "iterative oversight",
    );

    const list = await listDailyBriefNotebookWeeklyRecaps({
      parentId: "parent-1",
      programme: "DP",
    });

    expect(list).toHaveLength(1);
  });
});

async function saveAndListEntries() {
  const { listDailyBriefNotebookEntries } = await import("./daily-brief-notebook-store");

  return listDailyBriefNotebookEntries({
    parentId: "parent-1",
    programme: "DP",
  });
}
