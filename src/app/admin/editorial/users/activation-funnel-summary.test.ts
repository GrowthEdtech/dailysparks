import { describe, expect, test } from "vitest";

import type { OnboardingReminderRunRecord } from "../../../../lib/onboarding-reminder-history-schema";
import type { ParentProfile } from "../../../../lib/mvp-types";
import {
  getActivationAttentionState,
  getActivationDashboardSummary,
  getRecentReminderRunsForParent,
} from "./activation-funnel-summary";

function buildProfile(
  overrides: {
    parent?: Partial<ParentProfile["parent"]>;
    student?: Partial<ParentProfile["student"]>;
  } = {},
): ParentProfile {
  return {
    parent: {
      id: "parent-1",
      email: "parent@example.com",
      fullName: "Parent Example",
      countryCode: "HK",
      deliveryTimeZone: "Asia/Hong_Kong",
      preferredDeliveryLocalTime: "09:00",
      firstAuthenticatedAt: "2026-04-01T00:00:00.000Z",
      childProfileCompletedAt: null,
      firstDispatchableChannelAt: null,
      firstBriefDeliveredAt: null,
      firstPaidAt: null,
      onboardingReminderCount: 0,
      onboardingReminderLastAttemptAt: null,
      onboardingReminderLastSentAt: null,
      onboardingReminderLastStage: null,
      onboardingReminderLastStatus: null,
      onboardingReminderLastMessageId: null,
      onboardingReminderLastError: null,
      subscriptionStatus: "trial",
      subscriptionPlan: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      trialStartedAt: "2026-04-01T00:00:00.000Z",
      trialEndsAt: "2026-04-08T00:00:00.000Z",
      subscriptionActivatedAt: null,
      subscriptionRenewalAt: null,
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

function buildReminderRun(
  overrides: Partial<OnboardingReminderRunRecord> = {},
): OnboardingReminderRunRecord {
  return {
    id: "run-1",
    runAt: "2026-04-04T01:00:00.000Z",
    runDate: "2026-04-04",
    parentId: "parent-1",
    parentEmail: "parent@example.com",
    stageIndex: 1,
    stageLabel: "First activation reminder",
    status: "sent",
    messageId: "message-1",
    errorMessage: null,
    createdAt: "2026-04-04T01:00:00.000Z",
    ...overrides,
  };
}

describe("activation funnel summary helpers", () => {
  test("computes cumulative funnel counts across activation milestones", () => {
    const summary = getActivationDashboardSummary(
      [
        buildProfile(),
        buildProfile({
          parent: {
            id: "parent-2",
            email: "child@example.com",
            childProfileCompletedAt: "2026-04-01T01:00:00.000Z",
          },
          student: {
            studentName: "Mia",
          },
        }),
        buildProfile({
          parent: {
            id: "parent-3",
            email: "dispatchable@example.com",
            childProfileCompletedAt: "2026-04-01T01:00:00.000Z",
            firstDispatchableChannelAt: "2026-04-01T02:00:00.000Z",
          },
          student: {
            studentName: "Mia",
            goodnotesConnected: true,
            goodnotesVerifiedAt: "2026-04-01T02:00:00.000Z",
            goodnotesEmail: "mia@goodnotes.email",
          },
        }),
        buildProfile({
          parent: {
            id: "parent-4",
            email: "delivered@example.com",
            childProfileCompletedAt: "2026-04-01T01:00:00.000Z",
            firstDispatchableChannelAt: "2026-04-01T02:00:00.000Z",
            firstBriefDeliveredAt: "2026-04-01T03:00:00.000Z",
          },
          student: {
            studentName: "Mia",
            goodnotesConnected: true,
            goodnotesVerifiedAt: "2026-04-01T02:00:00.000Z",
            goodnotesEmail: "mia@goodnotes.email",
          },
        }),
        buildProfile({
          parent: {
            id: "parent-5",
            email: "paid@example.com",
            subscriptionStatus: "active",
            subscriptionPlan: "monthly",
            subscriptionActivatedAt: "2026-04-01T04:00:00.000Z",
            childProfileCompletedAt: "2026-04-01T01:00:00.000Z",
            firstDispatchableChannelAt: "2026-04-01T02:00:00.000Z",
            firstBriefDeliveredAt: "2026-04-01T03:00:00.000Z",
            firstPaidAt: "2026-04-01T04:00:00.000Z",
          },
          student: {
            studentName: "Mia",
            goodnotesConnected: true,
            goodnotesVerifiedAt: "2026-04-01T02:00:00.000Z",
            goodnotesEmail: "mia@goodnotes.email",
          },
        }),
      ],
      [],
      new Date("2026-04-04T02:00:00.000Z"),
    );

    expect(summary.counts.signed_in).toBe(5);
    expect(summary.counts.child_profile_completed).toBe(4);
    expect(summary.counts.dispatchable_channel_ready).toBe(3);
    expect(summary.counts.first_brief_delivered).toBe(2);
    expect(summary.counts.paid_activated).toBe(1);
  });

  test("surfaces stuck, reminder-failed, and paid-but-not-delivered attention states", () => {
    const now = new Date("2026-04-04T02:00:00.000Z");
    const stuckProfile = buildProfile({
      parent: {
        id: "parent-stuck",
        email: "stuck@example.com",
        childProfileCompletedAt: "2026-04-01T00:30:00.000Z",
      },
      student: {
        studentName: "Stuck Child",
      },
    });
    const paidProfile = buildProfile({
      parent: {
        id: "parent-paid",
        email: "paid@example.com",
        subscriptionStatus: "active",
        subscriptionPlan: "monthly",
        subscriptionActivatedAt: "2026-04-03T00:00:00.000Z",
        firstPaidAt: "2026-04-03T00:00:00.000Z",
        childProfileCompletedAt: "2026-04-01T00:30:00.000Z",
      },
      student: {
        studentName: "Paid Child",
      },
    });
    const failedReminderProfile = buildProfile({
      parent: {
        id: "parent-reminder-failed",
        email: "failed@example.com",
        onboardingReminderLastStatus: "failed",
        onboardingReminderLastError: "SMTP offline",
      },
      student: {
        studentName: "Failed Reminder Child",
      },
    });

    expect(getActivationAttentionState(stuckProfile, now)?.title).toContain("Channel setup stalled");
    expect(getActivationAttentionState(paidProfile, now)?.title).toContain(
      "Paid but first brief not delivered",
    );
    expect(getActivationAttentionState(failedReminderProfile, now)?.title).toContain(
      "Reminder failed",
    );

    const summary = getActivationDashboardSummary(
      [stuckProfile, paidProfile, failedReminderProfile],
      [],
      now,
    );

    expect(summary.stuckCount).toBe(1);
    expect(summary.paidButNotDeliveredCount).toBe(1);
    expect(summary.reminderFailureCount).toBe(1);
  });

  test("summarizes reminder evidence and filters recent runs per parent", () => {
    const reminderRuns = [
      buildReminderRun(),
      buildReminderRun({
        id: "run-2",
        status: "failed",
        messageId: null,
        errorMessage: "SMTP offline",
        parentId: "parent-2",
        parentEmail: "failed@example.com",
      }),
      buildReminderRun({
        id: "run-3",
        parentId: "parent-1",
        parentEmail: "parent@example.com",
        runAt: "2026-04-04T03:00:00.000Z",
        createdAt: "2026-04-04T03:00:00.000Z",
      }),
    ];

    const summary = getActivationDashboardSummary(
      [buildProfile(), buildProfile({ parent: { id: "parent-2" } })],
      reminderRuns,
      new Date("2026-04-04T04:00:00.000Z"),
    );

    expect(summary.reminderEvidence.totalRuns).toBe(3);
    expect(summary.reminderEvidence.sentRuns).toBe(2);
    expect(summary.reminderEvidence.failedRuns).toBe(1);

    expect(getRecentReminderRunsForParent(reminderRuns, "parent-1")).toHaveLength(2);
    expect(getRecentReminderRunsForParent(reminderRuns, "parent-1")[0]?.id).toBe(
      "run-3",
    );
  });
});
