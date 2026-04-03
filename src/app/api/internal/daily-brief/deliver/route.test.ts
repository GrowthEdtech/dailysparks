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

import { POST as deliverDailyBriefRoute } from "./route";
import {
  createDailyBriefHistoryEntry,
  listDailyBriefHistory,
} from "../../../../../lib/daily-brief-history-store";
import {
  getOrCreateParentProfile,
  updateParentNotionConnection,
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
  return new Request("http://localhost:3000/api/internal/daily-brief/deliver", {
    method: "POST",
    headers: {
      "x-daily-sparks-scheduler-secret": schedulerHeaderValue,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

function buildHistoryInput(
  overrides: Partial<Parameters<typeof createDailyBriefHistoryEntry>[0]> = {},
) {
  return {
    scheduledFor: "2026-04-03",
    headline: "Students map sea turtles",
    summary: "Families explore why migration tracking matters.",
    programme: "PYP" as const,
    status: "approved" as const,
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
    pipelineStage: "preflight_passed" as const,
    candidateSnapshotAt: "2026-04-03T05:00:00.000Z",
    generationCompletedAt: "2026-04-03T06:00:00.000Z",
    pdfBuiltAt: "2026-04-03T06:05:00.000Z",
    deliveryWindowAt: "2026-04-03T01:00:00.000Z",
    lastDeliveryAttemptAt: null,
    deliveryAttemptCount: 0,
    deliverySuccessCount: 0,
    deliveryFailureCount: 0,
    failedDeliveryTargets: [],
    failureReason: "",
    retryEligibleUntil: null,
    ...overrides,
  };
}

async function createEligibleProgrammeProfile(
  email: string,
  programme: "PYP" | "MYP" | "DP",
  channels: Array<"goodnotes" | "notion">,
) {
  await getOrCreateParentProfile({
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

  if (channels.includes("goodnotes")) {
    await updateStudentGoodnotesDelivery(email, {
      goodnotesConnected: true,
      goodnotesVerifiedAt: "2026-04-02T00:00:00.000Z",
      goodnotesLastDeliveryStatus: "success",
      goodnotesLastDeliveryMessage: "Ready.",
    });
  }

  if (channels.includes("notion")) {
    await updateParentNotionConnection(email, {
      notionConnected: true,
      notionWorkspaceId: `${programme.toLowerCase()}-workspace`,
      notionWorkspaceName: `${programme} Workspace`,
      notionDatabaseId: `${programme.toLowerCase()}-database`,
      notionDataSourceId: `${programme.toLowerCase()}-data-source`,
    });
  }
}

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-deliver-route-"),
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
  createNotionBriefPageMock.mockResolvedValue({
    pageId: "page-123",
    pageUrl: "https://www.notion.so/page-123",
  });
  vi.stubGlobal("fetch", vi.fn(() => {
    throw new Error("deliver route must not regenerate or fetch source content");
  }));
});

afterEach(async () => {
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("daily brief deliver route", () => {
  test("only operates on briefs that passed preflight", async () => {
    await createEligibleProgrammeProfile(
      "pyp-family@example.com",
      "PYP",
      ["goodnotes"],
    );
    await createEligibleProgrammeProfile(
      "myp-family@example.com",
      "MYP",
      ["notion"],
    );
    await createDailyBriefHistoryEntry(buildHistoryInput());
    await createDailyBriefHistoryEntry(
      buildHistoryInput({
        programme: "MYP",
        headline: "MYP draft brief",
        status: "draft",
        pipelineStage: "generated",
      }),
    );

    const response = await deliverDailyBriefRoute(
      buildRequest(SCHEDULER_HEADER_FIXTURE, {
        runDate: "2026-04-03",
      }),
    );
    const body = await response.json();
    const history = await listDailyBriefHistory({
      scheduledFor: "2026-04-03",
    });
    const publishedEntry = history.find((entry) => entry.programme === "PYP");
    const untouchedEntry = history.find((entry) => entry.programme === "MYP");

    expect(response.status).toBe(200);
    expect(body.mode).toBe("deliver");
    expect(body.summary.deliveredCount).toBe(1);
    expect(sendBriefToGoodnotesMock).toHaveBeenCalledTimes(1);
    expect(createNotionBriefPageMock).not.toHaveBeenCalled();
    expect(publishedEntry?.status).toBe("published");
    expect(publishedEntry?.pipelineStage).toBe("published");
    expect(publishedEntry?.deliveryReceipts).toEqual([
      expect.objectContaining({
        channel: "goodnotes",
        parentEmail: "pyp-family@example.com",
        attachmentFileName: "daily-sparks-pyp.pdf",
        externalId: "smtp-message-id",
      }),
    ]);
    expect(untouchedEntry?.status).toBe("draft");
  });

  test("records partial delivery failures without losing successful sends", async () => {
    await createEligibleProgrammeProfile(
      "pyp-family@example.com",
      "PYP",
      ["goodnotes", "notion"],
    );
    await createDailyBriefHistoryEntry(buildHistoryInput());
    createNotionBriefPageMock.mockRejectedValueOnce(new Error("Notion timed out."));

    const response = await deliverDailyBriefRoute(
      buildRequest(SCHEDULER_HEADER_FIXTURE, {
        runDate: "2026-04-03",
      }),
    );
    const body = await response.json();
    const history = await listDailyBriefHistory({
      scheduledFor: "2026-04-03",
    });

    expect(response.status).toBe(200);
    expect(body.summary.deliveryAttemptCount).toBe(2);
    expect(body.summary.deliverySuccessCount).toBe(1);
    expect(body.summary.deliveryFailureCount).toBe(1);
    expect(history[0]?.status).toBe("published");
    expect(history[0]?.deliveryAttemptCount).toBe(2);
    expect(history[0]?.deliverySuccessCount).toBe(1);
    expect(history[0]?.deliveryFailureCount).toBe(1);
    expect(history[0]?.failedDeliveryTargets).toEqual([
      expect.objectContaining({
        channel: "notion",
        parentEmail: "pyp-family@example.com",
      }),
    ]);
    expect(history[0]?.retryEligibleUntil).toBeTruthy();
  });

  test("only dispatches to canary profiles when canary mode is enabled", async () => {
    process.env.DAILY_BRIEF_DELIVERY_MODE = "canary";
    process.env.DAILY_BRIEF_CANARY_PARENT_EMAILS = "canary-family@example.com";

    await createEligibleProgrammeProfile(
      "canary-family@example.com",
      "PYP",
      ["goodnotes"],
    );
    await createEligibleProgrammeProfile(
      "general-family@example.com",
      "PYP",
      ["goodnotes"],
    );
    await createDailyBriefHistoryEntry(buildHistoryInput());

    const response = await deliverDailyBriefRoute(
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
        email: "canary-family@example.com",
      },
    });
    expect(sendBriefToGoodnotesMock.mock.calls[0]?.[2]).toEqual({
      attachmentMode: "canary",
    });
    expect(history[0]?.status).toBe("published");
  });

  test("honors request-level canary overrides without changing global env", async () => {
    await createEligibleProgrammeProfile(
      "canary-family@example.com",
      "PYP",
      ["goodnotes"],
    );
    await createEligibleProgrammeProfile(
      "general-family@example.com",
      "PYP",
      ["goodnotes"],
    );
    await createDailyBriefHistoryEntry(buildHistoryInput());

    const response = await deliverDailyBriefRoute(
      buildRequest(SCHEDULER_HEADER_FIXTURE, {
        runDate: "2026-04-03",
        dispatchMode: "canary",
        canaryParentEmails: ["canary-family@example.com"],
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary.dispatchMode).toBe("canary");
    expect(body.summary.targetedProfileCount).toBe(1);
    expect(body.summary.skippedProfileCount).toBe(1);
    expect(sendBriefToGoodnotesMock).toHaveBeenCalledTimes(1);
    expect(sendBriefToGoodnotesMock.mock.calls[0]?.[0]).toMatchObject({
      parent: {
        email: "canary-family@example.com",
      },
    });
    expect(sendBriefToGoodnotesMock.mock.calls[0]?.[2]).toEqual({
      attachmentMode: "canary",
    });
  });

  test("marks the brief failed when all configured deliveries fail", async () => {
    await createEligibleProgrammeProfile(
      "pyp-family@example.com",
      "PYP",
      ["goodnotes"],
    );
    await createDailyBriefHistoryEntry(buildHistoryInput());
    sendBriefToGoodnotesMock.mockRejectedValueOnce(new Error("SMTP offline."));

    const response = await deliverDailyBriefRoute(
      buildRequest(SCHEDULER_HEADER_FIXTURE, {
        runDate: "2026-04-03",
      }),
    );
    const body = await response.json();
    const history = await listDailyBriefHistory({
      scheduledFor: "2026-04-03",
    });

    expect(response.status).toBe(200);
    expect(body.summary.failedCount).toBe(1);
    expect(history[0]?.status).toBe("failed");
    expect(history[0]?.pipelineStage).toBe("failed");
    expect(history[0]?.deliveryFailureCount).toBe(1);
    expect(history[0]?.failedDeliveryTargets).toHaveLength(1);
  });
});
