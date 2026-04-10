import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const { sendTrialConversionNurtureEmailMock } = vi.hoisted(() => ({
  sendTrialConversionNurtureEmailMock: vi.fn(),
}));

vi.mock("../../../../../../lib/trial-conversion-nurture-email", () => ({
  sendTrialConversionNurtureEmail: (...args: unknown[]) =>
    sendTrialConversionNurtureEmailMock(...args),
}));

import { POST as trialConversionRoute } from "./route";
import {
  getOrCreateParentProfile,
  getProfileByEmail,
  updateParentGrowthMilestones,
} from "../../../../../../lib/mvp-store";
import { saveDailyBriefNotebookAuthoredEntry } from "../../../../../../lib/daily-brief-notebook-store";
import { saveDailyBriefNotebookWeeklyRecap } from "../../../../../../lib/daily-brief-notebook-weekly-recap-store";

const ORIGINAL_ENV = { ...process.env };
const SCHEDULER_HEADER_FIXTURE = "scheduler-header-fixture";

function buildRequest(schedulerHeaderValue = SCHEDULER_HEADER_FIXTURE) {
  return new Request(
    "http://localhost:3000/api/internal/marketing/trial-conversion/run",
    {
      method: "POST",
      headers: {
        "x-daily-sparks-scheduler-secret": schedulerHeaderValue,
      },
    },
  );
}

let tempDirectory = "";

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-trial-conversion-"),
  );

  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: "test",
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_STORE_PATH: path.join(tempDirectory, "mvp-store.json"),
    DAILY_SPARKS_DAILY_BRIEF_NOTEBOOK_STORE_PATH: path.join(
      tempDirectory,
      "daily-brief-notebook.json",
    ),
    DAILY_SPARKS_DAILY_BRIEF_NOTEBOOK_WEEKLY_RECAP_STORE_PATH: path.join(
      tempDirectory,
      "daily-brief-weekly-recaps.json",
    ),
    DAILY_SPARKS_SCHEDULER_SECRET: SCHEDULER_HEADER_FIXTURE,
  };

  sendTrialConversionNurtureEmailMock.mockReset();
  sendTrialConversionNurtureEmailMock.mockResolvedValue({
    sent: true,
    skipped: false,
    reason: null,
    messageId: "trial-conversion-message-id",
  });
});

afterEach(async () => {
  vi.useRealTimers();
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

async function seedTrialFamily(email: string) {
  const profile = await getOrCreateParentProfile({
    email,
    fullName: "Parent Example",
    studentName: "Theo",
  });

  await updateParentGrowthMilestones(email, {
    firstBriefDeliveredAt: "2026-04-10T00:20:00.000Z",
  });

  await saveDailyBriefNotebookAuthoredEntry({
    parentId: profile.parent.id,
    parentEmail: profile.parent.email,
    studentId: profile.student.id,
    programme: profile.student.programme,
    interestTags: [],
    briefId: "brief-1",
    scheduledFor: "2026-04-10",
    headline: "Headline",
    topicTags: [],
    knowledgeBankTitle: "Knowledge bank",
    entryType: "inquiry-notebook",
    body: "A trial note",
  });

  await saveDailyBriefNotebookWeeklyRecap({
    parentId: profile.parent.id,
    parentEmail: profile.parent.email,
    studentId: profile.student.id,
    programme: profile.student.programme,
    generationSource: "scheduled",
    recap: {
      programme: profile.student.programme,
      weekKey: "2026-04-07",
      weekLabel: "Apr 7 – Apr 13",
      title: "Weekly recap",
      totalEntries: 1,
      systemCount: 1,
      authoredCount: 0,
      topTags: ["TOK"],
      summaryLines: ["Summary"],
      entryTypeBreakdown: [],
      highlights: [],
      retrievalPrompts: [],
    },
  });
}

describe("trial conversion nurture scheduler route", () => {
  test("rejects requests with an invalid scheduler secret", async () => {
    const response = await trialConversionRoute(buildRequest("wrong-secret"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toMatch(/scheduler/i);
  });

  test("sends trial conversion nurture to due families and updates profile state", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-11T02:00:00.000Z"));
    await seedTrialFamily("parent@example.com");

    const response = await trialConversionRoute(buildRequest());
    const body = await response.json();
    const profile = await getProfileByEmail("parent@example.com");

    expect(response.status).toBe(200);
    expect(body.mode).toBe("trial-conversion-nurture");
    expect(body.summary.checkedProfileCount).toBe(1);
    expect(body.summary.sentCount).toBe(1);
    expect(sendTrialConversionNurtureEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stageIndex: 1,
        notebookEntryCount: 1,
        weeklyRecapCount: 1,
      }),
    );
    expect(profile?.parent.trialConversionNurtureCount).toBe(1);
    expect(profile?.parent.trialConversionNurtureLastStage).toBe(1);
    expect(profile?.parent.trialConversionNurtureLastStatus).toBe("sent");
  });

  test("records failed attempts when delivery errors", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-11T02:00:00.000Z"));
    await seedTrialFamily("failed@example.com");
    sendTrialConversionNurtureEmailMock.mockRejectedValueOnce(
      new Error("SMTP offline."),
    );

    const response = await trialConversionRoute(buildRequest());
    const body = await response.json();
    const profile = await getProfileByEmail("failed@example.com");

    expect(response.status).toBe(200);
    expect(body.summary.failedCount).toBe(1);
    expect(profile?.parent.trialConversionNurtureCount).toBe(1);
    expect(profile?.parent.trialConversionNurtureLastStatus).toBe("failed");
    expect(profile?.parent.trialConversionNurtureLastError).toMatch(/SMTP offline/i);
  });
});
