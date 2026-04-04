import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const { sendBriefToGoodnotesMock, createNotionBriefPageMock } = vi.hoisted(() => ({
  sendBriefToGoodnotesMock: vi.fn(),
  createNotionBriefPageMock: vi.fn(),
}));

vi.mock("./goodnotes-delivery", () => ({
  sendBriefToGoodnotes: (...args: unknown[]) => sendBriefToGoodnotesMock(...args),
}));

vi.mock("./notion", () => ({
  createNotionBriefPage: (...args: unknown[]) => createNotionBriefPageMock(...args),
}));

import { deliverHistoryBriefToProfiles } from "./daily-brief-stage-delivery";
import {
  getOrCreateParentProfile,
  getProfileByEmail,
  updateParentNotionConnection,
  updateParentSubscription,
  updateStudentGoodnotesDelivery,
  updateStudentPreferences,
} from "./mvp-store";

const ORIGINAL_ENV = { ...process.env };
let tempDirectory = "";

function buildBrief(overrides: Partial<Parameters<typeof deliverHistoryBriefToProfiles>[1]> = {}) {
  return {
    id: "brief-1",
    scheduledFor: "2026-04-04",
    recordKind: "production" as const,
    headline: "Students map sea turtles",
    summary: "A marine science brief.",
    programme: "PYP" as const,
    status: "approved" as const,
    topicTags: ["science", "oceans"],
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
    repetitionNotes: "No overlap.",
    adminNotes: "",
    briefMarkdown: "## PYP\nStudents map sea turtles.",
    pipelineStage: "preflight_passed" as const,
    candidateSnapshotAt: "2026-04-04T05:00:00.000Z",
    generationCompletedAt: "2026-04-04T06:00:00.000Z",
    pdfBuiltAt: "2026-04-04T06:05:00.000Z",
    deliveryWindowAt: "2026-04-04T09:00:00.000Z",
    lastDeliveryAttemptAt: null,
    deliveryAttemptCount: 0,
    deliverySuccessCount: 0,
    deliveryFailureCount: 0,
    deliveryReceipts: [],
    failedDeliveryTargets: [],
    failureReason: "",
    retryEligibleUntil: null,
    createdAt: "2026-04-04T00:00:00.000Z",
    updatedAt: "2026-04-04T00:00:00.000Z",
    ...overrides,
  };
}

async function createGoodnotesProfile() {
  await getOrCreateParentProfile({
    email: "goodnotes@example.com",
    fullName: "Goodnotes Parent",
    studentName: "Learner",
  });
  await updateParentSubscription("goodnotes@example.com", {
    subscriptionStatus: "active",
  });
  await updateStudentPreferences("goodnotes@example.com", {
    studentName: "Learner",
    programme: "PYP",
    programmeYear: 5,
    goodnotesEmail: "learner@goodnotes.email",
  });
  return updateStudentGoodnotesDelivery("goodnotes@example.com", {
    goodnotesConnected: true,
    goodnotesVerifiedAt: "2026-04-03T00:00:00.000Z",
    goodnotesLastDeliveryStatus: "success",
    goodnotesLastDeliveryMessage: "Welcome note sent. Goodnotes delivery is ready.",
  });
}

async function createNotionProfile() {
  await getOrCreateParentProfile({
    email: "notion@example.com",
    fullName: "Notion Parent",
    studentName: "Learner",
  });
  await updateParentSubscription("notion@example.com", {
    subscriptionStatus: "active",
  });
  await updateStudentPreferences("notion@example.com", {
    studentName: "Learner",
    programme: "PYP",
    programmeYear: 5,
    goodnotesEmail: "",
  });
  return updateParentNotionConnection("notion@example.com", {
    notionConnected: true,
    notionWorkspaceId: "workspace-1",
    notionWorkspaceName: "Family Workspace",
    notionBotId: "bot-1",
    notionDatabaseId: "database-1",
    notionDatabaseName: "Daily Sparks",
    notionDataSourceId: "data-source-1",
    notionLastSyncStatus: "success",
    notionLastSyncMessage: "Test page sent to Notion successfully.",
  });
}

async function createPendingGoodnotesProfile() {
  await getOrCreateParentProfile({
    email: "pending-goodnotes@example.com",
    fullName: "Pending Goodnotes Parent",
    studentName: "Learner",
  });
  await updateParentSubscription("pending-goodnotes@example.com", {
    subscriptionStatus: "active",
  });
  await updateStudentPreferences("pending-goodnotes@example.com", {
    studentName: "Learner",
    programme: "PYP",
    programmeYear: 5,
    goodnotesEmail: "learner@goodnotes.email",
  });

  return updateStudentGoodnotesDelivery("pending-goodnotes@example.com", {
    goodnotesConnected: true,
    goodnotesVerifiedAt: "2026-04-03T00:00:00.000Z",
    goodnotesLastDeliveryStatus: "idle",
    goodnotesLastDeliveryMessage: "Waiting for the first daily brief.",
  });
}

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-stage-delivery-"),
  );
  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: "test",
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_STORE_PATH: path.join(tempDirectory, "mvp-store.json"),
  };

  sendBriefToGoodnotesMock.mockReset();
  createNotionBriefPageMock.mockReset();
});

afterEach(async () => {
  vi.useRealTimers();
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("daily brief stage delivery", () => {
  test("writes Goodnotes delivery success back to the family profile", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-04T09:00:00.000Z"));

    const profile = await createGoodnotesProfile();
    sendBriefToGoodnotesMock.mockResolvedValue({
      attachmentFileName:
        "2026-04-04_DailySparks_DailyBrief_PYP_students-map-sea-turtles.pdf",
      messageId: "message-1",
    });

    await deliverHistoryBriefToProfiles([profile!], buildBrief());

    const updatedProfile = await getProfileByEmail("goodnotes@example.com");

    expect(updatedProfile?.student.goodnotesLastDeliveryStatus).toBe("success");
    expect(updatedProfile?.student.goodnotesLastDeliveryMessage).toMatch(
      /delivered successfully/i,
    );
    expect(updatedProfile?.parent.firstBriefDeliveredAt).toBe(
      "2026-04-04T09:00:00.000Z",
    );
  });

  test("writes Notion delivery failures back to the family profile", async () => {
    const profile = await createNotionProfile();
    createNotionBriefPageMock.mockRejectedValue(new Error("Notion API timeout."));

    await deliverHistoryBriefToProfiles([profile!], buildBrief());

    const updatedProfile = await getProfileByEmail("notion@example.com");

    expect(updatedProfile?.parent.notionLastSyncStatus).toBe("failed");
    expect(updatedProfile?.parent.notionLastSyncMessage).toMatch(
      /notion api timeout/i,
    );
  });

  test("skips normal delivery for channels that are not dispatchable yet", async () => {
    const profile = await createPendingGoodnotesProfile();
    sendBriefToGoodnotesMock.mockResolvedValue({
      attachmentFileName: "welcome-note.pdf",
      messageId: "message-1",
    });

    const summary = await deliverHistoryBriefToProfiles([profile!], buildBrief());

    expect(sendBriefToGoodnotesMock).not.toHaveBeenCalled();
    expect(summary.deliveryAttemptCount).toBe(0);
    expect(summary.deliverySuccessCount).toBe(0);
  });

  test("allows retry attempts for verified channels that currently need attention", async () => {
    await createGoodnotesProfile();
    await updateStudentGoodnotesDelivery("goodnotes@example.com", {
      goodnotesConnected: true,
      goodnotesLastDeliveryStatus: "failed",
      goodnotesLastDeliveryMessage: "SMTP relay timeout.",
    });
    const failedProfile = await getProfileByEmail("goodnotes@example.com");
    sendBriefToGoodnotesMock.mockResolvedValue({
      attachmentFileName: "retry-brief.pdf",
      messageId: "message-2",
    });

    const summary = await deliverHistoryBriefToProfiles([failedProfile!], buildBrief(), {
      retryTargets: [
        {
          parentId: failedProfile!.parent.id,
          parentEmail: failedProfile!.parent.email,
          channel: "goodnotes",
          errorMessage: "SMTP relay timeout.",
        },
      ],
    });

    expect(sendBriefToGoodnotesMock).toHaveBeenCalledTimes(1);
    expect(summary.deliveryAttemptCount).toBe(1);
    expect(summary.deliverySuccessCount).toBe(1);
  });
});
