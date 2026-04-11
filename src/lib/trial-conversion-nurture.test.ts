import { describe, expect, test } from "vitest";

import { assessTrialConversionNurture } from "./trial-conversion-nurture";
import type { ParentProfile } from "./mvp-types";

function buildProfile(overrides?: Partial<ParentProfile["parent"]>): ParentProfile {
  return {
    parent: {
      id: "parent-1",
      email: "parent@example.com",
      fullName: "Parent Example",
      countryCode: "HK",
      deliveryTimeZone: "Asia/Hong_Kong",
      preferredDeliveryLocalTime: "09:00",
      firstAuthenticatedAt: "2026-04-10T00:00:00.000Z",
      childProfileCompletedAt: "2026-04-10T00:05:00.000Z",
      firstDispatchableChannelAt: "2026-04-10T00:10:00.000Z",
      firstBriefDeliveredAt: "2026-04-10T00:20:00.000Z",
      firstPaidAt: null,
      onboardingReminderCount: 0,
      onboardingReminderLastAttemptAt: null,
      onboardingReminderLastSentAt: null,
      onboardingReminderLastStage: null,
      onboardingReminderLastStatus: null,
      onboardingReminderLastMessageId: null,
      onboardingReminderLastError: null,
      subscriptionStatus: "trial",
      subscriptionPlan: "monthly",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      trialStartedAt: "2026-04-10T00:00:00.000Z",
      trialEndsAt: "2026-04-17T00:00:00.000Z",
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
      createdAt: "2026-04-10T00:00:00.000Z",
      updatedAt: "2026-04-10T00:20:00.000Z",
      ...overrides,
    },
    student: {
      id: "student-1",
      parentId: "parent-1",
      studentName: "Theo",
      programme: "DP",
      programmeYear: 1,
      interestTags: [],
      goodnotesEmail: "theo@goodnotes.email",
      goodnotesConnected: true,
      goodnotesVerifiedAt: "2026-04-10T00:10:00.000Z",
      goodnotesLastTestSentAt: null,
      goodnotesLastDeliveryStatus: "success",
      goodnotesLastDeliveryMessage: "Ready.",
      notionConnected: false,
      createdAt: "2026-04-10T00:00:00.000Z",
      updatedAt: "2026-04-10T00:20:00.000Z",
    },
  };
}

describe("trial conversion nurture", () => {
  test("marks stage 1 due 24 hours after the first brief", () => {
    const result = assessTrialConversionNurture({
      profile: buildProfile(),
      now: new Date("2026-04-11T01:00:00.000Z"),
    });

    expect(result.eligible).toBe(true);
    expect(result.due).toBe(true);
    expect(result.stage?.index).toBe(1);
  });

  test("marks stage 2 due after stage 1 has already been sent", () => {
    const result = assessTrialConversionNurture({
      profile: buildProfile({
        trialConversionNurtureCount: 1,
        trialConversionNurtureLastStage: 1,
        trialConversionNurtureLastStatus: "sent",
        trialConversionNurtureLastSentAt: "2026-04-11T01:00:00.000Z",
      }),
      now: new Date("2026-04-14T02:00:00.000Z"),
    });

    expect(result.eligible).toBe(true);
    expect(result.due).toBe(true);
    expect(result.stage?.index).toBe(2);
  });

  test("skips profiles that have not yet reached first brief delivery", () => {
    const result = assessTrialConversionNurture({
      profile: buildProfile({
        firstBriefDeliveredAt: null,
      }),
      now: new Date("2026-04-11T02:00:00.000Z"),
    });

    expect(result.eligible).toBe(false);
    expect(result.due).toBe(false);
    expect(result.reason).toMatch(/first brief/i);
  });

  test("skips profiles that already paid", () => {
    const result = assessTrialConversionNurture({
      profile: buildProfile({
        firstPaidAt: "2026-04-12T00:00:00.000Z",
        subscriptionStatus: "active",
        subscriptionActivatedAt: "2026-04-12T00:00:00.000Z",
      }),
      now: new Date("2026-04-14T02:00:00.000Z"),
    });

    expect(result.eligible).toBe(false);
    expect(result.due).toBe(false);
    expect(result.reason).toMatch(/already paid/i);
  });
});
