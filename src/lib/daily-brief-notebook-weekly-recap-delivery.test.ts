import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  getOrCreateParentProfile,
  updateStudentPreferences,
  updateParentNotionConnection,
} from "./mvp-store";
import { saveDailyBriefNotebookEntries } from "./daily-brief-notebook-store";
import {
  getDailyBriefNotebookWeeklyRecap,
  saveDailyBriefNotebookWeeklyRecapResponse,
} from "./daily-brief-notebook-weekly-recap-store";
import { deliverNotebookWeeklyRecapForProfile } from "./daily-brief-notebook-weekly-recap-delivery";

const {
  syncNotebookWeeklyRecapToNotionMock,
  sendDailyBriefNotebookWeeklyRecapEmailMock,
  isDailyBriefNotebookWeeklyRecapEmailConfiguredMock,
} = vi.hoisted(() => ({
  syncNotebookWeeklyRecapToNotionMock: vi.fn(),
  sendDailyBriefNotebookWeeklyRecapEmailMock: vi.fn(),
  isDailyBriefNotebookWeeklyRecapEmailConfiguredMock: vi.fn(),
}));

vi.mock("./daily-brief-notebook-notion-sync", () => ({
  syncNotebookWeeklyRecapToNotion: syncNotebookWeeklyRecapToNotionMock,
}));

vi.mock("./daily-brief-notebook-weekly-recap-email", () => ({
  sendDailyBriefNotebookWeeklyRecapEmail: sendDailyBriefNotebookWeeklyRecapEmailMock,
  isDailyBriefNotebookWeeklyRecapEmailConfigured:
    isDailyBriefNotebookWeeklyRecapEmailConfiguredMock,
}));

const ORIGINAL_ENV = { ...process.env };
let tempDirectory = "";

beforeEach(async () => {
  tempDirectory = await mkdtemp(path.join(tmpdir(), "daily-sparks-weekly-delivery-"));
  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_STORE_PATH: path.join(tempDirectory, "mvp-store.json"),
    DAILY_SPARKS_DAILY_BRIEF_NOTEBOOK_STORE_PATH: path.join(
      tempDirectory,
      "daily-brief-notebook.json",
    ),
    DAILY_SPARKS_DAILY_BRIEF_NOTEBOOK_WEEKLY_RECAP_STORE_PATH: path.join(
      tempDirectory,
      "daily-brief-notebook-weekly-recaps.json",
    ),
  };
  syncNotebookWeeklyRecapToNotionMock.mockReset();
  sendDailyBriefNotebookWeeklyRecapEmailMock.mockReset();
  isDailyBriefNotebookWeeklyRecapEmailConfiguredMock.mockReset();
  isDailyBriefNotebookWeeklyRecapEmailConfiguredMock.mockReturnValue(true);
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("deliverNotebookWeeklyRecapForProfile", () => {
  test("persists the recap, preserves retrieval responses, and sends the weekly email only once", async () => {
    const profile = await getOrCreateParentProfile({
      email: "parent@example.com",
      fullName: "Parent Example",
      studentName: "Katherine",
    });
    await updateStudentPreferences("parent@example.com", {
      studentName: "Katherine",
      programme: "DP",
      programmeYear: 1,
      goodnotesEmail: "katherine@goodnotes.email",
      interestTags: ["TOK", "Philosophy"],
    });
    await updateParentNotionConnection("parent@example.com", {
      notionWorkspaceId: "workspace-123",
      notionWorkspaceName: "Growth Education",
      notionBotId: "bot-123",
      notionDatabaseId: "database-123",
      notionDatabaseName: "Daily Sparks Reading Archive",
      notionDataSourceId: "data-source-123",
      notionAuthorizedAt: "2026-04-07T00:00:00.000Z",
    });

    await saveDailyBriefNotebookEntries({
      parentId: profile.parent.id,
      parentEmail: profile.parent.email,
      studentId: profile.student.id,
      programme: "DP",
      interestTags: ["TOK", "Philosophy"],
      briefId: "brief-1",
      scheduledFor: "2026-04-10",
      headline: "Governments debate whether AI regulation can keep up",
      topicTags: ["AI", "Ethics"],
      knowledgeBankTitle: "Academic idea bank",
      entries: [
        { title: "Claim", body: "Regulation is justified when risk scales fast." },
        {
          title: "Counterpoint",
          body: "Early regulation can overreach when evidence is incomplete.",
        },
      ],
    });

    syncNotebookWeeklyRecapToNotionMock.mockResolvedValue({
      status: "synced",
      message: "Weekly recap synced to Notion.",
      pageId: "notion-page-1",
      pageUrl: "https://www.notion.so/notion-page-1",
    });
    sendDailyBriefNotebookWeeklyRecapEmailMock.mockResolvedValue({
      messageId: "weekly-email-1",
      subject: "Your Daily Sparks weekly recap is ready",
    });

    const firstRun = await deliverNotebookWeeklyRecapForProfile({
      profile: {
        ...profile,
        student: {
          ...profile.student,
          programme: "DP",
          programmeYear: 1,
          interestTags: ["TOK", "Philosophy"],
          notionConnected: true,
        },
      },
      asOf: "2026-04-12T10:00:00.000Z",
      source: "scheduled",
      syncNotion: true,
      sendEmail: true,
    });

    expect(firstRun.status).toBe("generated");
    expect(firstRun.record?.weekKey).toBe("2026-04-06");
    expect(syncNotebookWeeklyRecapToNotionMock).toHaveBeenCalledTimes(1);
    expect(sendDailyBriefNotebookWeeklyRecapEmailMock).toHaveBeenCalledTimes(1);

    const persistedAfterFirstRun = await getDailyBriefNotebookWeeklyRecap({
      parentId: profile.parent.id,
      programme: "DP",
      weekKey: "2026-04-06",
    });

    expect(persistedAfterFirstRun?.retrievalPrompts.length).toBeGreaterThan(0);

    await saveDailyBriefNotebookWeeklyRecapResponse({
      parentId: profile.parent.id,
      programme: "DP",
      weekKey: "2026-04-06",
      promptEntryId: persistedAfterFirstRun!.retrievalPrompts[0]!.entryId,
      response: "I would add stronger comparative evidence now.",
    });

    const secondRun = await deliverNotebookWeeklyRecapForProfile({
      profile: {
        ...profile,
        student: {
          ...profile.student,
          programme: "DP",
          programmeYear: 1,
          interestTags: ["TOK", "Philosophy"],
          notionConnected: true,
        },
      },
      asOf: "2026-04-12T10:05:00.000Z",
      source: "scheduled",
      syncNotion: true,
      sendEmail: true,
    });

    expect(secondRun.status).toBe("generated");
    expect(sendDailyBriefNotebookWeeklyRecapEmailMock).toHaveBeenCalledTimes(1);

    const persistedAfterSecondRun = await getDailyBriefNotebookWeeklyRecap({
      parentId: profile.parent.id,
      programme: "DP",
      weekKey: "2026-04-06",
    });

    expect(persistedAfterSecondRun?.retrievalResponses).toHaveLength(1);
    expect(persistedAfterSecondRun?.retrievalResponses[0]?.response).toContain(
      "stronger comparative evidence",
    );
  });

  test("skips families with no notebook entries for the week", async () => {
    const profile = await getOrCreateParentProfile({
      email: "empty@example.com",
      fullName: "Empty Parent",
      studentName: "Jordan",
    });
    await updateStudentPreferences("empty@example.com", {
      studentName: "Jordan",
      programme: "MYP",
      programmeYear: 2,
      goodnotesEmail: "jordan@goodnotes.email",
      interestTags: ["Tech & Innovation"],
    });

    const result = await deliverNotebookWeeklyRecapForProfile({
      profile: {
        ...profile,
        student: {
          ...profile.student,
          programme: "MYP",
          programmeYear: 2,
          interestTags: ["Tech & Innovation"],
        },
      },
      asOf: "2026-04-12T10:00:00.000Z",
      source: "scheduled",
      syncNotion: true,
      sendEmail: true,
    });

    expect(result.status).toBe("skipped");
    expect(syncNotebookWeeklyRecapToNotionMock).not.toHaveBeenCalled();
    expect(sendDailyBriefNotebookWeeklyRecapEmailMock).not.toHaveBeenCalled();
  });
});
