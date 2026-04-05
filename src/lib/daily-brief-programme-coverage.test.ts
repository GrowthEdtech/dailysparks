import { describe, expect, test } from "vitest";

import type { DailyBriefHistoryRecord } from "./daily-brief-history-schema";
import type { ParentProfile } from "./mvp-types";
import { buildDailyBriefProgrammeCoverage } from "./daily-brief-programme-coverage";

function buildProfile(overrides: Partial<ParentProfile> = {}): ParentProfile {
  return {
    parent: {
      id: "parent-1",
      email: "family@example.com",
      fullName: "Family Example",
      countryCode: "HK",
      deliveryTimeZone: "Asia/Hong_Kong",
      preferredDeliveryLocalTime: "09:00",
      subscriptionStatus: "active",
      subscriptionPlan: "monthly",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      trialStartedAt: "2026-04-01T00:00:00.000Z",
      trialEndsAt: "2026-04-08T00:00:00.000Z",
      subscriptionActivatedAt: "2026-04-01T00:00:00.000Z",
      subscriptionRenewalAt: "2026-05-01T00:00:00.000Z",
      latestInvoiceId: null,
      latestInvoiceNumber: null,
      latestInvoiceStatus: null,
      latestInvoiceHostedUrl: null,
      latestInvoicePdfUrl: null,
      latestInvoiceAmountPaid: null,
      latestInvoiceCurrency: null,
      latestInvoicePaidAt: null,
      latestInvoicePeriodStart: null,
      latestInvoicePeriodEnd: null,
      notionWorkspaceId: null,
      notionWorkspaceName: null,
      notionBotId: null,
      notionDatabaseId: null,
      notionDatabaseName: null,
      notionDataSourceId: null,
      notionAuthorizedAt: null,
      notionLastSyncedAt: null,
      notionLastSyncStatus: null,
      notionLastSyncMessage: null,
      notionLastSyncPageId: null,
      notionLastSyncPageUrl: null,
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
      ...overrides.parent,
    },
    student: {
      id: "student-1",
      parentId: "parent-1",
      studentName: "Student",
      programme: "PYP",
      programmeYear: 5,
      goodnotesEmail: "",
      goodnotesConnected: false,
      goodnotesVerifiedAt: null,
      goodnotesLastTestSentAt: null,
      goodnotesLastDeliveryStatus: null,
      goodnotesLastDeliveryMessage: null,
      notionConnected: false,
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
      ...overrides.student,
    },
  };
}

function buildHistoryRecord(
  overrides: Partial<DailyBriefHistoryRecord> = {},
): DailyBriefHistoryRecord {
  return {
    id: "brief-1",
    scheduledFor: "2026-04-05",
    recordKind: "production",
    headline: "Cities expand cooling spaces for students.",
    normalizedHeadline: "cities expand cooling spaces for students",
    summary: "A climate operations brief.",
    programme: "PYP",
    editorialCohort: "APAC",
    status: "published",
    topicClusterKey: "cooling spaces for students",
    topicLatestPublishedAt: "2026-04-05T06:00:00.000Z",
    selectionDecision: "new",
    selectionOverrideNote: "",
    blockedTopics: [],
    topicTags: ["climate"],
    sourceReferences: [],
    aiConnectionId: "nf-relay",
    aiConnectionName: "NF Relay",
    aiModel: "gpt-5.4",
    promptPolicyId: "policy-1",
    promptVersionLabel: "v1.1.1",
    promptVersion: "v1.1.1",
    repetitionRisk: "low",
    repetitionNotes: "No similar brief.",
    adminNotes: "",
    briefMarkdown: "## Today",
    pipelineStage: "published",
    candidateSnapshotAt: "2026-04-05T05:00:00.000Z",
    generationCompletedAt: "2026-04-05T06:00:00.000Z",
    pdfBuiltAt: "2026-04-05T06:05:00.000Z",
    deliveryWindowAt: "2026-04-05T09:00:00.000Z",
    lastDeliveryAttemptAt: "2026-04-05T09:00:00.000Z",
    deliveryAttemptCount: 1,
    deliverySuccessCount: 1,
    deliveryFailureCount: 0,
    deliveryReceipts: [],
    failedDeliveryTargets: [],
    failureReason: "",
    retryEligibleUntil: null,
    createdAt: "2026-04-05T06:00:00.000Z",
    updatedAt: "2026-04-05T09:00:00.000Z",
    ...overrides,
  };
}

describe("buildDailyBriefProgrammeCoverage", () => {
  test("separates generated coverage, active audience coverage, and dispatch readiness", () => {
    const coverage = buildDailyBriefProgrammeCoverage({
      scheduledFor: "2026-04-05",
      profiles: [
        buildProfile({
          parent: {
            id: "apac-pyp",
            email: "apac-pyp@example.com",
          },
          student: {
            parentId: "apac-pyp",
            programme: "PYP",
            studentName: "APAC PYP",
          },
        }),
        buildProfile({
          parent: {
            id: "apac-myp",
            email: "apac-myp@example.com",
          },
          student: {
            id: "student-2",
            parentId: "apac-myp",
            programme: "MYP",
            programmeYear: 3,
            studentName: "APAC MYP",
            goodnotesEmail: "myp@goodnotes.email",
            goodnotesConnected: true,
            goodnotesVerifiedAt: "2026-04-01T00:00:00.000Z",
            goodnotesLastDeliveryStatus: "success",
            goodnotesLastDeliveryMessage: "Delivered",
          },
        }),
        buildProfile({
          parent: {
            id: "apac-dp",
            email: "apac-dp@example.com",
            subscriptionStatus: "free",
          },
          student: {
            id: "student-3",
            parentId: "apac-dp",
            programme: "DP",
            programmeYear: 1,
            studentName: "APAC DP",
          },
        }),
      ],
      history: [
        buildHistoryRecord({
          programme: "MYP",
          headline: "MYP climate brief",
          normalizedHeadline: "myp climate brief",
          editorialCohort: "APAC",
        }),
      ],
    });

    const apacPyp = coverage.find(
      (row) => row.editorialCohort === "APAC" && row.programme === "PYP",
    );
    const apacMyp = coverage.find(
      (row) => row.editorialCohort === "APAC" && row.programme === "MYP",
    );
    const apacDp = coverage.find(
      (row) => row.editorialCohort === "APAC" && row.programme === "DP",
    );

    expect(apacPyp).toMatchObject({
      activeFamilyCount: 1,
      dispatchableFamilyCount: 0,
      status: "no_healthy_delivery_channel",
      statusLabel: "No healthy delivery channel",
    });
    expect(apacMyp).toMatchObject({
      activeFamilyCount: 1,
      dispatchableFamilyCount: 1,
      generatedBriefCount: 1,
      status: "generated",
      statusLabel: "Generated",
    });
    expect(apacDp).toMatchObject({
      activeFamilyCount: 0,
      dispatchableFamilyCount: 0,
      status: "no_active_families",
      statusLabel: "No active families",
    });
  });
});
