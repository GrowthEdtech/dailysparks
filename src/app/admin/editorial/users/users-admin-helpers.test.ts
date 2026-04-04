import { describe, expect, test } from "vitest";

import type { ParentProfile } from "../../../../lib/mvp-types";
import {
  countProfilesNeedingActivationReminder,
  getOnboardingReminderStatus,
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
});
