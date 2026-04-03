import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const { sendBriefToGoodnotesMock, createNotionBriefPageMock } = vi.hoisted(() => ({
  sendBriefToGoodnotesMock: vi.fn(),
  createNotionBriefPageMock: vi.fn(),
}));

vi.mock("../../../../../lib/goodnotes-delivery", () => ({
  sendBriefToGoodnotes: (...args: unknown[]) => sendBriefToGoodnotesMock(...args),
}));

vi.mock("../../../../../lib/notion", () => ({
  createNotionBriefPage: (...args: unknown[]) => createNotionBriefPageMock(...args),
}));

import { POST as retryDailyBriefRoute } from "./route";
import {
  createDailyBriefHistoryEntry,
  listDailyBriefHistory,
} from "../../../../../lib/daily-brief-history-store";
import {
  getOrCreateParentProfile,
  updateParentSubscription,
  updateStudentGoodnotesDelivery,
  updateStudentPreferences,
} from "../../../../../lib/mvp-store";

const ORIGINAL_ENV = { ...process.env };
let tempDirectory = "";
const SCHEDULER_HEADER_FIXTURE = ["scheduler", "header", "fixture"].join("-");

function buildRequest(
  schedulerHeaderValue = SCHEDULER_HEADER_FIXTURE,
  body?: Record<string, unknown>,
) {
  return new Request(
    "http://localhost:3000/api/internal/daily-brief/retry-delivery",
    {
      method: "POST",
      headers: {
        "x-daily-sparks-scheduler-secret": schedulerHeaderValue,
        ...(body ? { "content-type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  );
}

function buildHistoryInput(
  overrides: Partial<Parameters<typeof createDailyBriefHistoryEntry>[0]> = {},
) {
  return {
    scheduledFor: "2026-04-03",
    headline: "Students map sea turtles",
    summary: "Families explore why migration tracking matters.",
    programme: "PYP" as const,
    status: "published" as const,
    topicTags: ["oceans", "science"],
    sourceReferences: [
      {
        sourceId: "bbc",
        sourceName: "BBC",
        sourceDomain: "bbc.com",
        articleTitle: "Students map sea turtles",
        articleUrl: "https://www.bbc.com/news/world-123",
      },
    ],
    aiConnectionId: "nf-relay",
    aiConnectionName: "NF Relay",
    aiModel: "gpt-5.4",
    promptPolicyId: "policy-1",
    promptVersionLabel: "v1.0.0",
    promptVersion: "v1.0.0",
    repetitionRisk: "low" as const,
    repetitionNotes: "No recent overlap.",
    adminNotes: "",
    briefMarkdown: "## Today\nStudents track turtle migration.",
    pipelineStage: "published" as const,
    candidateSnapshotAt: "2026-04-03T05:00:00.000Z",
    generationCompletedAt: "2026-04-03T06:00:00.000Z",
    pdfBuiltAt: "2026-04-03T06:05:00.000Z",
    deliveryWindowAt: "2026-04-03T01:00:00.000Z",
    lastDeliveryAttemptAt: "2026-04-03T01:00:00.000Z",
    deliveryAttemptCount: 2,
    deliverySuccessCount: 1,
    deliveryFailureCount: 1,
    failedDeliveryTargets: [
      {
        parentId: "parent-2",
        parentEmail: "pyp-2@example.com",
        channel: "goodnotes" as const,
        errorMessage: "SMTP timed out.",
      },
    ],
    failureReason: "One channel failed.",
    retryEligibleUntil: "2026-04-03T01:30:00.000Z",
    ...overrides,
  };
}

async function createEligibleProgrammeProfile(
  email: string,
  programme: "PYP" | "MYP" | "DP",
) {
  const profile = await getOrCreateParentProfile({
    email,
    fullName: `${programme} Family`,
    studentName: `${programme} Learner`,
  });
  await updateParentSubscription(email, {
    subscriptionStatus: "active",
  });
  await updateStudentPreferences(email, {
    studentName: `${programme} Learner`,
    goodnotesEmail: `${programme.toLowerCase()}@goodnotes.email`,
    programme,
    programmeYear: programme === "DP" ? 1 : programme === "MYP" ? 3 : 5,
  });
  await updateStudentGoodnotesDelivery(email, {
    goodnotesConnected: true,
    goodnotesVerifiedAt: "2026-04-02T00:00:00.000Z",
    goodnotesLastDeliveryStatus: "success",
    goodnotesLastDeliveryMessage: "Ready.",
  });

  return profile;
}

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-retry-deliver-route-"),
  );

  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: "test",
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_STORE_PATH: path.join(tempDirectory, "mvp-store.json"),
    DAILY_SPARKS_DAILY_BRIEF_STORE_PATH: path.join(
      tempDirectory,
      "daily-brief-history.json",
    ),
    DAILY_SPARKS_SCHEDULER_SECRET: SCHEDULER_HEADER_FIXTURE,
  };

  sendBriefToGoodnotesMock.mockReset();
  createNotionBriefPageMock.mockReset();
  sendBriefToGoodnotesMock.mockResolvedValue({
    messageId: "smtp-message-id",
    attachmentFileName: "daily-sparks-pyp.pdf",
  });
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("daily brief retry-delivery route", () => {
  test("only retries failed recipient-channel combinations", async () => {
    const firstProfile = await createEligibleProgrammeProfile(
      "pyp-1@example.com",
      "PYP",
    );
    const secondProfile = await createEligibleProgrammeProfile(
      "pyp-2@example.com",
      "PYP",
    );
    await createDailyBriefHistoryEntry(
      buildHistoryInput({
        failedDeliveryTargets: [
          {
            parentId: secondProfile.parent.id,
            parentEmail: secondProfile.parent.email,
            channel: "goodnotes",
            errorMessage: "SMTP timed out.",
          },
        ],
      }),
    );

    const response = await retryDailyBriefRoute(
      buildRequest(SCHEDULER_HEADER_FIXTURE, {
        runDate: "2026-04-03",
      }),
    );
    const body = await response.json();
    const history = await listDailyBriefHistory({
      scheduledFor: "2026-04-03",
    });

    expect(response.status).toBe(200);
    expect(body.summary.retriedCount).toBe(1);
    expect(sendBriefToGoodnotesMock).toHaveBeenCalledTimes(1);
    expect(sendBriefToGoodnotesMock.mock.calls[0]?.[0]).toMatchObject({
      parent: {
        id: secondProfile.parent.id,
      },
    });
    expect(sendBriefToGoodnotesMock.mock.calls[0]?.[0]).not.toMatchObject({
      parent: {
        id: firstProfile.parent.id,
      },
    });
    expect(history[0]?.failedDeliveryTargets).toEqual([]);
    expect(history[0]?.status).toBe("published");
  });

  test("respects retryEligibleUntil and skips expired retry windows", async () => {
    const profile = await createEligibleProgrammeProfile(
      "pyp-2@example.com",
      "PYP",
    );
    await createDailyBriefHistoryEntry(
      buildHistoryInput({
        failedDeliveryTargets: [
          {
            parentId: profile.parent.id,
            parentEmail: profile.parent.email,
            channel: "goodnotes",
            errorMessage: "SMTP timed out.",
          },
        ],
        retryEligibleUntil: "2026-04-03T00:30:00.000Z",
      }),
    );

    const response = await retryDailyBriefRoute(
      buildRequest(SCHEDULER_HEADER_FIXTURE, {
        runDate: "2026-04-03",
      }),
    );
    const body = await response.json();
    const history = await listDailyBriefHistory({
      scheduledFor: "2026-04-03",
    });

    expect(response.status).toBe(200);
    expect(body.summary.retriedCount).toBe(0);
    expect(sendBriefToGoodnotesMock).not.toHaveBeenCalled();
    expect(history[0]?.failedDeliveryTargets).toHaveLength(1);
  });

  test("only retries failed canary profiles when canary mode is enabled", async () => {
    process.env.DAILY_BRIEF_DELIVERY_MODE = "canary";
    process.env.DAILY_BRIEF_CANARY_PARENT_EMAILS = "canary-family@example.com";

    const canaryProfile = await createEligibleProgrammeProfile(
      "canary-family@example.com",
      "PYP",
    );
    const generalProfile = await createEligibleProgrammeProfile(
      "general-family@example.com",
      "PYP",
    );
    await createDailyBriefHistoryEntry(
      buildHistoryInput({
        failedDeliveryTargets: [
          {
            parentId: canaryProfile.parent.id,
            parentEmail: canaryProfile.parent.email,
            channel: "goodnotes",
            errorMessage: "SMTP timed out.",
          },
          {
            parentId: generalProfile.parent.id,
            parentEmail: generalProfile.parent.email,
            channel: "goodnotes",
            errorMessage: "SMTP timed out.",
          },
        ],
      }),
    );

    const response = await retryDailyBriefRoute(
      buildRequest(SCHEDULER_HEADER_FIXTURE, {
        runDate: "2026-04-03",
      }),
    );
    const body = await response.json();
    const history = await listDailyBriefHistory({
      scheduledFor: "2026-04-03",
    });

    expect(response.status).toBe(200);
    expect(body.summary.dispatchMode).toBe("canary");
    expect(body.summary.targetedProfileCount).toBe(1);
    expect(body.summary.skippedProfileCount).toBe(1);
    expect(sendBriefToGoodnotesMock).toHaveBeenCalledTimes(1);
    expect(sendBriefToGoodnotesMock.mock.calls[0]?.[0]).toMatchObject({
      parent: {
        id: canaryProfile.parent.id,
      },
    });
    expect(history[0]?.failedDeliveryTargets).toEqual([
      expect.objectContaining({
        parentId: generalProfile.parent.id,
      }),
    ]);
  });
});
