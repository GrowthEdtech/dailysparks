import { describe, expect, test } from "vitest";

import type { ParentProfile } from "./mvp-types";
import type { PlannedNotificationRunRecord } from "./planned-notification-history-schema";
import {
  buildPlannedNotificationOpsQueue,
  getPlannedNotificationRetryDecision,
} from "./planned-notification-ops";

function buildProfile(
  overrides: Partial<ParentProfile> & {
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
      onboardingReminderCount: 0,
      onboardingReminderLastAttemptAt: null,
      onboardingReminderLastSentAt: null,
      onboardingReminderLastStage: null,
      onboardingReminderLastStatus: null,
      onboardingReminderLastMessageId: null,
      onboardingReminderLastError: null,
      trialEndingReminderLastNotifiedAt: null,
      trialEndingReminderLastTrialEndsAt: null,
      trialEndingReminderLastResolvedAt: null,
      trialEndingReminderLastResolvedTrialEndsAt: null,
      billingStatusNotificationLastSentAt: null,
      billingStatusNotificationLastInvoiceId: null,
      billingStatusNotificationLastInvoiceStatus: null,
      billingStatusNotificationLastResolvedAt: null,
      billingStatusNotificationLastResolvedInvoiceId: null,
      billingStatusNotificationLastResolvedInvoiceStatus: null,
      deliverySupportAlertLastNotifiedAt: null,
      deliverySupportAlertLastReasonKey: null,
      deliverySupportAlertLastResolvedAt: null,
      deliverySupportAlertLastResolvedReasonKey: null,
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
      studentName: "Katherine",
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

function buildHistoryEntry(
  overrides: Partial<PlannedNotificationRunRecord>,
): PlannedNotificationRunRecord {
  return {
    id: "run-1",
    runAt: "2026-04-05T00:00:00.000Z",
    runDate: "2026-04-05",
    parentId: "parent-1",
    parentEmail: "parent@example.com",
    notificationFamily: "trial-ending-reminder",
    source: "growth-reconciliation",
    status: "failed",
    reason: "Trial ending soon",
    deduped: false,
    messageId: null,
    errorMessage: "SMTP offline",
    invoiceId: null,
    invoiceStatus: null,
    trialEndsAt: "2026-04-08T00:00:00.000Z",
    reasonKey: null,
    createdAt: "2026-04-05T00:00:00.000Z",
    ...overrides,
  };
}

describe("planned notification ops queue", () => {
  test("marks a current failed notification as retry due after cooldown", () => {
    const profile = buildProfile();
    const now = new Date("2026-04-05T02:00:00.000Z");
    const history = [
      buildHistoryEntry({
        runAt: "2026-04-05T00:45:00.000Z",
        createdAt: "2026-04-05T00:45:00.000Z",
      }),
    ];

    const decision = getPlannedNotificationRetryDecision({
      profile,
      notificationFamily: "trial-ending-reminder",
      history,
      now,
    });
    const queue = buildPlannedNotificationOpsQueue({
      profiles: [profile],
      history,
      now,
    });

    expect(decision.kind).toBe("retry-due");
    expect(queue.summary.retryDueCount).toBe(1);
    expect(queue.items[0]?.queueLabel).toBe("Retry due");
  });

  test("escalates a notification after repeated failures for the current state", () => {
    const profile = buildProfile({
      parent: {
        id: "parent-2",
        email: "billing@example.com",
        subscriptionStatus: "active",
        subscriptionActivatedAt: "2026-04-02T00:00:00.000Z",
        latestInvoiceId: "in_456",
        latestInvoiceStatus: "open",
      },
      student: {
        id: "student-2",
        parentId: "parent-2",
        studentName: "Morgan",
        programme: "MYP",
        programmeYear: 2,
      },
    });
    const now = new Date("2026-04-05T02:00:00.000Z");
    const history = [
      buildHistoryEntry({
        id: "run-b-1",
        parentId: "parent-2",
        parentEmail: "billing@example.com",
        notificationFamily: "billing-status-update",
        invoiceId: "in_456",
        invoiceStatus: "open",
        runAt: "2026-04-05T00:30:00.000Z",
        createdAt: "2026-04-05T00:30:00.000Z",
      }),
      buildHistoryEntry({
        id: "run-b-2",
        parentId: "parent-2",
        parentEmail: "billing@example.com",
        notificationFamily: "billing-status-update",
        invoiceId: "in_456",
        invoiceStatus: "open",
        runAt: "2026-04-05T01:15:00.000Z",
        createdAt: "2026-04-05T01:15:00.000Z",
      }),
    ];

    const decision = getPlannedNotificationRetryDecision({
      profile,
      notificationFamily: "billing-status-update",
      history,
      now,
    });
    const queue = buildPlannedNotificationOpsQueue({
      profiles: [profile],
      history,
      now,
    });

    expect(decision.kind).toBe("escalated");
    expect(decision.failureCount).toBe(2);
    expect(queue.summary.escalatedCount).toBe(1);
    expect(queue.items[0]?.queueLabel).toBe("Manual intervention required");
  });

  test("keeps deduped actionable notifications in the queue for ops follow-up", () => {
    const profile = buildProfile({
      parent: {
        id: "parent-3",
        email: "support@example.com",
        subscriptionStatus: "active",
        subscriptionActivatedAt: "2026-04-02T00:00:00.000Z",
        deliverySupportAlertLastNotifiedAt: "2026-04-04T01:00:00.000Z",
        deliverySupportAlertLastReasonKey:
          "active access is live, but no dispatchable goodnotes or notion channel is ready yet.",
      },
      student: {
        id: "student-3",
        parentId: "parent-3",
        studentName: "Support Student",
        programme: "DP",
        programmeYear: 1,
      },
    });

    const queue = buildPlannedNotificationOpsQueue({
      profiles: [profile],
      history: [],
      now: new Date("2026-04-05T02:00:00.000Z"),
    });

    expect(queue.summary.dedupedCount).toBe(1);
    expect(queue.items[0]?.queueLabel).toBe("Deduped unresolved");
  });

  test("tracks aging buckets and sorts oldest unresolved work first within the same severity", () => {
    const olderPendingProfile = buildProfile({
      parent: {
        id: "parent-4",
        email: "older@example.com",
        fullName: "Older Pending Parent",
        subscriptionStatus: "active",
        trialStartedAt: "2026-03-25T00:00:00.000Z",
        subscriptionActivatedAt: "2026-03-31T00:00:00.000Z",
      },
      student: {
        id: "student-4",
        parentId: "parent-4",
      },
    });

    const newerPendingProfile = buildProfile({
      parent: {
        id: "parent-5",
        email: "newer@example.com",
        fullName: "Newer Pending Parent",
        subscriptionStatus: "active",
        trialStartedAt: "2026-04-04T12:00:00.000Z",
        subscriptionActivatedAt: "2026-04-05T14:00:00.000Z",
      },
      student: {
        id: "student-5",
        parentId: "parent-5",
      },
    });

    const now = new Date("2026-04-06T00:00:00.000Z");
    const queue = buildPlannedNotificationOpsQueue({
      profiles: [newerPendingProfile, olderPendingProfile],
      history: [],
      now,
    });

    expect(queue.summary.under24hCount).toBe(1);
    expect(queue.summary.over72hCount).toBe(1);
    expect(queue.items[0]?.parentEmail).toBe("older@example.com");
    expect(queue.items[0]?.agingLabel).toBe("Older than 72h");
    expect(queue.items[1]?.parentEmail).toBe("newer@example.com");
    expect(queue.items[1]?.agingLabel).toBe("Under 24h");
  });
});
