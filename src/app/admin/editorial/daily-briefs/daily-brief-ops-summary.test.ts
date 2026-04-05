import { describe, expect, test } from "vitest";

import type { DailyBriefHistoryRecord } from "../../../../lib/daily-brief-history-schema";
import type { ParentProfile } from "../../../../lib/mvp-types";
import { buildDailyBriefOpsSummary } from "./daily-brief-ops-summary";

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
      goodnotesEmail: "student@goodnotes.email",
      goodnotesConnected: true,
      goodnotesVerifiedAt: "2026-04-01T00:00:00.000Z",
      goodnotesLastTestSentAt: "2026-04-01T00:00:00.000Z",
      goodnotesLastDeliveryStatus: "success",
      goodnotesLastDeliveryMessage: "Daily brief delivered successfully.",
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
    scheduledFor: "2026-04-03",
    recordKind: "production",
    headline: "Cities expand cooling spaces for students.",
    summary: "A climate operations brief.",
    programme: "PYP",
    status: "published",
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
    candidateSnapshotAt: "2026-04-03T05:00:00.000Z",
    generationCompletedAt: "2026-04-03T06:00:00.000Z",
    pdfBuiltAt: "2026-04-03T06:05:00.000Z",
    deliveryWindowAt: "2026-04-03T09:00:00.000Z",
    lastDeliveryAttemptAt: "2026-04-03T09:00:00.000Z",
    deliveryAttemptCount: 1,
    deliverySuccessCount: 1,
    deliveryFailureCount: 0,
    deliveryReceipts: [
      {
        parentId: "parent-1",
        parentEmail: "family@example.com",
        channel: "goodnotes",
        renderer: "typst",
        attachmentFileName:
          "2026-04-03_DailySparks_DailyBrief_PYP_cooling-spaces.pdf",
        externalId: "smtp-1",
        externalUrl: null,
      },
    ],
    renderAudit: {
      renderer: "typst",
      layoutVariant: "pyp-one-page",
      pageCount: 1,
      onePageCompliant: true,
      auditedAt: "2026-04-03T09:00:00.000Z",
    },
    failedDeliveryTargets: [],
    failureReason: "",
    retryEligibleUntil: null,
    createdAt: "2026-04-03T06:00:00.000Z",
    updatedAt: "2026-04-03T09:00:00.000Z",
    ...overrides,
  };
}

describe("buildDailyBriefOpsSummary", () => {
  test("summarizes today delivery health, skipped families, and risky briefs", () => {
    const profiles = [
      buildProfile(),
      buildProfile({
        parent: {
          id: "parent-2",
          email: "attention@example.com",
          fullName: "Attention Family",
          countryCode: "US",
          deliveryTimeZone: "America/New_York",
          preferredDeliveryLocalTime: "09:00",
        },
        student: {
          id: "student-2",
          parentId: "parent-2",
          studentName: "Ava",
          programme: "PYP",
          goodnotesEmail: "ava@goodnotes.email",
          goodnotesLastDeliveryStatus: "failed",
          goodnotesLastDeliveryMessage: "Relay timeout.",
        },
      }),
      buildProfile({
        parent: {
          id: "parent-3",
          email: "verification@example.com",
          fullName: "Verification Family",
          countryCode: "GB",
          deliveryTimeZone: "Europe/London",
          preferredDeliveryLocalTime: "09:00",
          notionWorkspaceId: "workspace-1",
          notionWorkspaceName: "Family Workspace",
          notionBotId: "bot-1",
          notionDatabaseId: "db-1",
          notionDatabaseName: "Daily Sparks",
          notionDataSourceId: "source-1",
        },
        student: {
          id: "student-3",
          parentId: "parent-3",
          studentName: "Milo",
          programme: "MYP",
          goodnotesEmail: "",
          goodnotesConnected: false,
          goodnotesVerifiedAt: null,
          goodnotesLastTestSentAt: null,
          goodnotesLastDeliveryStatus: null,
          goodnotesLastDeliveryMessage: null,
          notionConnected: false,
        },
      }),
    ];

    const history = [
      buildHistoryRecord(),
      buildHistoryRecord({
        id: "brief-2",
        headline: "Schools reopen after transit delays.",
        programme: "MYP",
        status: "failed",
        pipelineStage: "failed",
        deliverySuccessCount: 0,
        deliveryFailureCount: 0,
        deliveryReceipts: [],
        failedDeliveryTargets: [],
        failureReason: "Source validation failed.",
      }),
    ];

    const summary = buildDailyBriefOpsSummary({
      profiles,
      history,
      runDate: "2026-04-03",
    });

    expect(summary.publishedBriefCount).toBe(1);
    expect(summary.briefsNeedingFollowUpCount).toBe(1);
    expect(summary.deliveredFamilyCount).toBe(1);
    expect(summary.skippedFamilies).toHaveLength(2);
    expect(summary.skippedFamilies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          parentEmail: "attention@example.com",
          reason: "Delivery channel needs attention",
          localDeliveryWindow: "9:00 AM · America/New York",
        }),
        expect.objectContaining({
          parentEmail: "verification@example.com",
          reason: "Brief blocked before dispatch",
          localDeliveryWindow: "9:00 AM · Europe/London",
        }),
      ]),
    );
    expect(summary.channelWatchlist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          parentEmail: "attention@example.com",
          issues: ["Goodnotes needs attention"],
          localDeliveryWindow: "9:00 AM · America/New York",
        }),
        expect.objectContaining({
          parentEmail: "verification@example.com",
          issues: ["Notion verification needed"],
          localDeliveryWindow: "9:00 AM · Europe/London",
        }),
      ]),
    );
    expect(summary.briefsNeedingFollowUp).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          headline: "Schools reopen after transit delays.",
          reason: "Source validation failed.",
        }),
      ]),
    );
    expect(summary.typstDeliveredBriefCount).toBe(1);
    expect(summary.pypTypstAuditedBriefCount).toBe(1);
    expect(summary.pypOnePageCompliantBriefCount).toBe(1);
    expect(summary.pypPdfLibFallbackBriefCount).toBe(0);
    expect(summary.mypCompareOnlyBriefCount).toBe(1);
  });

  test("prefers dispatch audit reasons over generic missing receipt fallbacks", () => {
    const profile = buildProfile({
      parent: {
        id: "parent-canary",
        email: "canary-skip@example.com",
        deliveryTimeZone: "Asia/Hong_Kong",
      },
      student: {
        id: "student-canary",
        parentId: "parent-canary",
      },
    });
    const history = [
      buildHistoryRecord({
        deliveryReceipts: [],
        dispatchMode: "canary",
        targetedProfiles: [],
        skippedProfiles: [
          {
            parentId: "parent-canary",
            parentEmail: "canary-skip@example.com",
            localDeliveryWindow: "9:00 AM · Asia/Hong Kong",
            reason: "Skipped by canary mode for this delivery wave.",
          },
        ],
      }),
    ];

    const summary = buildDailyBriefOpsSummary({
      profiles: [profile],
      history,
      runDate: "2026-04-03",
    });

    expect(summary.skippedFamilies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          parentEmail: "canary-skip@example.com",
          reason: "Skipped by canary mode for this delivery wave.",
        }),
      ]),
    );
    expect(summary.deliveredFamilyCount).toBe(0);
  });

  test("ignores non-production records and inactive families in today summary", () => {
    const profiles = [
      buildProfile({
        parent: {
          id: "parent-active",
          email: "active@example.com",
        },
      }),
      buildProfile({
        parent: {
          id: "parent-expired",
          email: "expired@example.com",
          subscriptionStatus: "trial",
          trialEndsAt: "2026-04-01T00:00:00.000Z",
        },
        student: {
          id: "student-expired",
          parentId: "parent-expired",
          goodnotesEmail: "",
          goodnotesConnected: false,
          goodnotesVerifiedAt: null,
          goodnotesLastTestSentAt: null,
          goodnotesLastDeliveryStatus: null,
          goodnotesLastDeliveryMessage: null,
        },
      }),
    ];

    const history = [
      buildHistoryRecord({
        recordKind: "test",
        deliveryReceipts: [],
        deliverySuccessCount: 0,
      }),
    ];

    const summary = buildDailyBriefOpsSummary({
      profiles,
      history,
      runDate: "2026-04-03",
    });

    expect(summary.deliveredFamilyCount).toBe(0);
    expect(summary.skippedFamilies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          parentEmail: "active@example.com",
        }),
      ]),
    );
    expect(summary.skippedFamilies).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          parentEmail: "expired@example.com",
        }),
      ]),
    );
  });

  test("captures each active family's local delivery window in the ops summary", () => {
    const profiles = [
      buildProfile({
        parent: {
          id: "parent-ny",
          email: "newyork@example.com",
          fullName: "New York Family",
          countryCode: "US",
          deliveryTimeZone: "America/New_York",
          preferredDeliveryLocalTime: "09:30",
        },
        student: {
          id: "student-ny",
          parentId: "parent-ny",
          studentName: "Avery",
          goodnotesLastDeliveryStatus: "failed",
          goodnotesLastDeliveryMessage: "Relay timeout.",
        },
      }),
    ];

    const summary = buildDailyBriefOpsSummary({
      profiles,
      history: [],
      runDate: "2026-04-03",
    });

    expect(summary.skippedFamilies).toEqual([
      expect.objectContaining({
        parentEmail: "newyork@example.com",
        localDeliveryWindow: "9:30 AM · America/New York",
      }),
    ]);
    expect(summary.channelWatchlist).toEqual([
      expect.objectContaining({
        parentEmail: "newyork@example.com",
        localDeliveryWindow: "9:30 AM · America/New York",
      }),
    ]);
  });
});
