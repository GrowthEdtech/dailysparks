import { describe, expect, test } from "vitest";

import type { ParentProfile } from "../../../../lib/mvp-types";
import {
  countProfilesNeedingActivationReminder,
  getOnboardingReminderStatus,
  getPlannedNotificationOpsSummary,
  getPlannedNotificationStatuses,
} from "./users-admin-helpers";

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
      billingStatusNotificationLastSentAt: null,
      billingStatusNotificationLastInvoiceId: null,
      billingStatusNotificationLastInvoiceStatus: null,
      deliverySupportAlertLastNotifiedAt: null,
      deliverySupportAlertLastReasonKey: null,
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

describe("users admin reminder helpers", () => {
  test("counts failed reminder cases as needing activation follow-up", () => {
    const profiles = [
      buildProfile({
        parent: {
          onboardingReminderLastAttemptAt: "2026-04-02T01:00:00.000Z",
          onboardingReminderLastStatus: "failed",
          onboardingReminderLastError: "SMTP offline",
        },
      }),
    ];

    expect(countProfilesNeedingActivationReminder(profiles)).toBe(1);
  });

  test("surfaces failed reminder status even while retry cooldown is active", () => {
    const status = getOnboardingReminderStatus(
      buildProfile({
        parent: {
          onboardingReminderLastAttemptAt: new Date().toISOString(),
          onboardingReminderLastStatus: "failed",
          onboardingReminderLastError: "SMTP offline",
        },
      }),
    );

    expect(status.label).toBe("Reminder failed");
    expect(status.detail).toMatch(/SMTP offline/i);
  });

  test("marks trial ending reminders as deduped when the current trial window was already notified", () => {
    const statuses = getPlannedNotificationStatuses(
      buildProfile({
        parent: {
          trialEndsAt: "2026-04-08T00:00:00.000Z",
          trialEndingReminderLastNotifiedAt: "2026-04-05T01:00:00.000Z",
          trialEndingReminderLastTrialEndsAt: "2026-04-08T00:00:00.000Z",
        },
      }),
      new Date("2026-04-05T02:00:00.000Z"),
    );

    expect(statuses.trialEnding.label).toBe("Deduped");
    expect(statuses.trialEnding.detail).toMatch(/already covers this trial window/i);
  });

  test("marks billing updates as pending when the latest invoice state has not been emailed", () => {
    const statuses = getPlannedNotificationStatuses(
      buildProfile({
        parent: {
          subscriptionStatus: "active",
          subscriptionActivatedAt: "2026-04-02T00:00:00.000Z",
          latestInvoiceId: "in_456",
          latestInvoiceStatus: "open",
          billingStatusNotificationLastSentAt: "2026-04-04T01:00:00.000Z",
          billingStatusNotificationLastInvoiceId: "in_123",
          billingStatusNotificationLastInvoiceStatus: "paid",
        },
      }),
      new Date("2026-04-05T02:00:00.000Z"),
    );

    expect(statuses.billingStatus.label).toBe("Pending");
    expect(statuses.billingStatus.detail).toMatch(/invoice open/i);
  });

  test("summarizes pending and deduped planned notifications for ops", () => {
    const summary = getPlannedNotificationOpsSummary(
      [
        buildProfile({
          parent: {
            trialEndingReminderLastNotifiedAt: "2026-04-05T01:00:00.000Z",
            trialEndingReminderLastTrialEndsAt: "2026-04-08T00:00:00.000Z",
          },
        }),
        buildProfile({
          parent: {
            id: "parent-2",
            email: "billing@example.com",
            subscriptionStatus: "active",
            subscriptionActivatedAt: "2026-04-02T00:00:00.000Z",
            latestInvoiceId: "in_456",
            latestInvoiceStatus: "open",
          },
        }),
        buildProfile({
          parent: {
            id: "parent-3",
            email: "support@example.com",
            subscriptionStatus: "active",
            subscriptionActivatedAt: "2026-04-02T00:00:00.000Z",
            deliverySupportAlertLastNotifiedAt: "2026-04-04T01:00:00.000Z",
            deliverySupportAlertLastReasonKey:
              "active access is live, but no dispatchable goodnotes or notion channel is ready yet.",
          },
        }),
      ],
      new Date("2026-04-05T02:00:00.000Z"),
    );

    expect(summary.trialEnding.actionableCount).toBe(1);
    expect(summary.trialEnding.dedupedCount).toBe(1);
    expect(summary.billingStatus.actionableCount).toBe(1);
    expect(summary.billingStatus.dedupedCount).toBe(0);
    expect(summary.deliverySupport.actionableCount).toBe(2);
    expect(summary.deliverySupport.dedupedCount).toBe(1);
  });
});
