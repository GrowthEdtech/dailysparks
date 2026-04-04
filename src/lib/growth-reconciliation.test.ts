import { describe, expect, test } from "vitest";

import type { ParentProfile } from "./mvp-types";
import { getGrowthReconciliationSummary } from "./growth-reconciliation";

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
      childProfileCompletedAt: "2026-04-01T01:00:00.000Z",
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

describe("growth reconciliation", () => {
  test("summarizes high-value revenue and delivery risks into distinct buckets", () => {
    const now = new Date("2026-04-04T02:00:00.000Z");

    const summary = getGrowthReconciliationSummary(
      [
        buildProfile({
          parent: {
            id: "trial-expiring",
            email: "trial-expiring@example.com",
            trialEndsAt: "2026-04-05T00:00:00.000Z",
          },
        }),
        buildProfile({
          parent: {
            id: "active-no-channel",
            email: "active-no-channel@example.com",
            subscriptionStatus: "active",
            subscriptionPlan: "monthly",
            subscriptionActivatedAt: "2026-04-02T00:00:00.000Z",
            firstPaidAt: "2026-04-02T00:00:00.000Z",
          },
        }),
        buildProfile({
          parent: {
            id: "active-no-delivery",
            email: "active-no-delivery@example.com",
            subscriptionStatus: "active",
            subscriptionPlan: "monthly",
            subscriptionActivatedAt: "2026-04-02T00:00:00.000Z",
            firstPaidAt: "2026-04-02T00:00:00.000Z",
            firstDispatchableChannelAt: "2026-04-02T02:00:00.000Z",
          },
          student: {
            goodnotesEmail: "leo@goodnotes.email",
            goodnotesConnected: true,
            goodnotesVerifiedAt: "2026-04-02T02:00:00.000Z",
            goodnotesLastDeliveryStatus: "success",
          },
        }),
        buildProfile({
          parent: {
            id: "failed-reminder",
            email: "failed-reminder@example.com",
            onboardingReminderLastStatus: "failed",
            onboardingReminderLastError: "SMTP offline",
          },
        }),
      ],
      now,
    );

    expect(summary.checkedProfileCount).toBe(4);
    expect(summary.trialsExpiringSoonWithoutFirstBrief.count).toBe(1);
    expect(summary.activeWithoutDispatchableChannel.count).toBe(1);
    expect(summary.activeWithoutFirstSuccessfulDelivery.count).toBe(1);
    expect(summary.reminderFailuresBlockingActivation.count).toBe(1);
    expect(summary.trialsExpiringSoonWithoutFirstBrief.families[0]?.reason).toMatch(
      /expir/i,
    );
    expect(summary.activeWithoutDispatchableChannel.families[0]?.reason).toMatch(
      /dispatchable/i,
    );
    expect(
      summary.activeWithoutFirstSuccessfulDelivery.families[0]?.reason,
    ).toMatch(/first brief/i);
    expect(summary.reminderFailuresBlockingActivation.families[0]?.reason).toMatch(
      /SMTP offline/i,
    );
  });

  test("does not double-count active families with no channel as no-delivery cases", () => {
    const now = new Date("2026-04-04T02:00:00.000Z");
    const summary = getGrowthReconciliationSummary(
      [
        buildProfile({
          parent: {
            id: "active-no-channel",
            email: "active-no-channel@example.com",
            subscriptionStatus: "active",
            subscriptionPlan: "monthly",
            subscriptionActivatedAt: "2026-04-02T00:00:00.000Z",
            firstPaidAt: "2026-04-02T00:00:00.000Z",
          },
        }),
      ],
      now,
    );

    expect(summary.activeWithoutDispatchableChannel.count).toBe(1);
    expect(summary.activeWithoutFirstSuccessfulDelivery.count).toBe(0);
  });
});
