import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const { sendBriefToGoodnotesMock, createNotionBriefPageMock } = vi.hoisted(() => ({
  sendBriefToGoodnotesMock: vi.fn(),
  createNotionBriefPageMock: vi.fn(),
}));
const { revalidatePathMock } = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
}));

vi.mock("../../../../lib/goodnotes-delivery", () => ({
  DAILY_BRIEF_PDF_RENDERERS: ["typst"],
  sendBriefToGoodnotes: (...args: unknown[]) => sendBriefToGoodnotesMock(...args),
}));

vi.mock("../../../../lib/notion", () => ({
  createNotionBriefPage: (...args: unknown[]) => createNotionBriefPageMock(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

import { POST as adminLogin } from "../login/route";
import { POST as syntheticCanaryActionRoute } from "./route";
import {
  createDailyBriefHistoryEntry,
  getDailyBriefHistoryEntry,
} from "../../../../lib/daily-brief-history-store";
import {
  EDITORIAL_ADMIN_SESSION_COOKIE_NAME,
} from "../../../../lib/editorial-admin-auth";
import {
  getOrCreateParentProfile,
  updateParentSubscription,
  updateStudentGoodnotesDelivery,
  updateStudentPreferences,
} from "../../../../lib/mvp-store";

const ORIGINAL_ENV = { ...process.env };
const validAdminSecret = "open-sesame";
let tempDirectory = "";

function buildHistoryInput(
  overrides: Partial<Parameters<typeof createDailyBriefHistoryEntry>[0]> = {},
) {
  return {
    scheduledFor: "2026-04-06",
    recordKind: "production" as const,
    headline: "Students map sea turtles",
    summary: "Families explore why migration tracking matters.",
    programme: "PYP" as const,
    editorialCohort: "APAC" as const,
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
    promptVersionLabel: "v1.1.1",
    promptVersion: "v1.1.1",
    repetitionRisk: "low" as const,
    repetitionNotes: "No recent overlap.",
    adminNotes: "",
    briefMarkdown: "## Today\nStudents track turtle migration.",
    pipelineStage: "preflight_passed" as const,
    candidateSnapshotAt: "2026-04-06T05:00:00.000Z",
    generationCompletedAt: "2026-04-06T06:00:00.000Z",
    pdfBuiltAt: "2026-04-06T06:05:00.000Z",
    deliveryWindowAt: "2026-04-06T01:00:00.000Z",
    lastDeliveryAttemptAt: null,
    deliveryAttemptCount: 0,
    deliverySuccessCount: 0,
    deliveryFailureCount: 0,
    failedDeliveryTargets: [],
    failureReason: "Synthetic canary gate blocked production delivery.",
    retryEligibleUntil: null,
    syntheticCanary: {
      status: "blocked" as const,
      targetParentEmails: ["synthetic-canary@example.com"],
      attemptCount: 2,
      successCount: 0,
      failureCount: 2,
      autoRetryCount: 1,
      lastAttemptAt: "2026-04-06T01:00:00.000Z",
      lastPassedAt: null,
      blockedAt: "2026-04-06T01:01:00.000Z",
      releasedAt: null,
      releasedBy: null,
      releaseReason: "",
      lastFailureReason:
        "Synthetic canary delivery failed after one automatic retry.",
      lastFailedTargets: [
        {
          parentId: "parent-canary",
          parentEmail: "synthetic-canary@example.com",
          channel: "goodnotes" as const,
          errorMessage: "Relay timeout.",
        },
      ],
      lastDeliveryReceipts: [],
      renderAudit: null,
    },
    ...overrides,
  };
}

async function signIn() {
  const response = await adminLogin(
    new Request("http://localhost:3000/api/admin/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        password: validAdminSecret,
      }),
    }),
  );
  const setCookieHeader = response.headers.get("set-cookie") ?? "";
  const match = setCookieHeader.match(
    new RegExp(`${EDITORIAL_ADMIN_SESSION_COOKIE_NAME}=([^;]+)`),
  );

  return match
    ? `${EDITORIAL_ADMIN_SESSION_COOKIE_NAME}=${decodeURIComponent(match[1])}`
    : "";
}

async function createCanaryProfile(email: string) {
  await getOrCreateParentProfile({
    email,
    fullName: "Canary Family",
    studentName: "Harper",
  });
  await updateParentSubscription(email, {
    subscriptionStatus: "active",
  });
  await updateStudentPreferences(email, {
    studentName: "Harper",
    programme: "PYP",
    programmeYear: 5,
    goodnotesEmail: "synthetic-canary@goodnotes.email",
  });
  await updateStudentGoodnotesDelivery(email, {
    goodnotesConnected: true,
    goodnotesVerifiedAt: "2026-04-05T00:00:00.000Z",
    goodnotesLastDeliveryStatus: "success",
    goodnotesLastDeliveryMessage: "Ready.",
  });
}

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-synthetic-canary-action-"),
  );

  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: "test",
    DAILY_SPARKS_EDITORIAL_ADMIN_PASSWORD: validAdminSecret,
    DAILY_SPARKS_EDITORIAL_ADMIN_SESSION_SECRET:
      "test-editorial-admin-session-secret",
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_STORE_PATH: path.join(tempDirectory, "mvp-store.json"),
    DAILY_SPARKS_DAILY_BRIEF_STORE_PATH: path.join(
      tempDirectory,
      "daily-brief-history.json",
    ),
    DAILY_BRIEF_SYNTHETIC_CANARY_ENABLED: "true",
    DAILY_BRIEF_SYNTHETIC_CANARY_PARENT_EMAILS:
      "synthetic-canary@example.com",
  };
  sendBriefToGoodnotesMock.mockReset();
  createNotionBriefPageMock.mockReset();
  revalidatePathMock.mockReset();
  sendBriefToGoodnotesMock.mockResolvedValue({
    messageId: "smtp-message-id",
    attachmentFileName: "daily-sparks-pyp-canary.pdf",
  });
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("admin daily brief synthetic canary action route", () => {
  test("releases a blocked brief for manual override", async () => {
    const cookie = await signIn();
    const entry = await createDailyBriefHistoryEntry(buildHistoryInput());

    const response = await syntheticCanaryActionRoute(
      new Request(
        "http://localhost:3000/api/admin/daily-brief-synthetic-canary-action",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie,
          },
          body: JSON.stringify({
            briefId: entry.id,
            action: "release",
            releaseReason: "Ops approved manual release.",
          }),
        },
      ),
    );
    const body = await response.json();
    const updated = await getDailyBriefHistoryEntry(entry.id);

    expect(response.status).toBe(200);
    expect(body.syntheticCanaryStatus).toBe("released");
    expect(updated?.syntheticCanary).toEqual(
      expect.objectContaining({
        status: "released",
        releaseReason: "Ops approved manual release.",
        releasedBy: "editorial-admin",
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/editorial/daily-briefs");
    expect(revalidatePathMock).toHaveBeenCalledWith(
      `/admin/editorial/daily-briefs/${entry.id}`,
    );
  });

  test("reruns a blocked synthetic canary and stores a passed result", async () => {
    const cookie = await signIn();
    await createCanaryProfile("synthetic-canary@example.com");
    const entry = await createDailyBriefHistoryEntry(buildHistoryInput());

    const response = await syntheticCanaryActionRoute(
      new Request(
        "http://localhost:3000/api/admin/daily-brief-synthetic-canary-action",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie,
          },
          body: JSON.stringify({
            briefId: entry.id,
            action: "rerun",
          }),
        },
      ),
    );
    const body = await response.json();
    const updated = await getDailyBriefHistoryEntry(entry.id);

    expect(response.status).toBe(200);
    expect(body.syntheticCanaryStatus).toBe("passed");
    expect(sendBriefToGoodnotesMock).toHaveBeenCalledTimes(1);
    expect(sendBriefToGoodnotesMock.mock.calls[0]?.[2]).toEqual({
      attachmentMode: "canary",
      renderer: "typst",
    });
    expect(updated?.syntheticCanary).toEqual(
      expect.objectContaining({
        status: "passed",
        targetParentEmails: ["synthetic-canary@example.com"],
      }),
    );
  });
});
