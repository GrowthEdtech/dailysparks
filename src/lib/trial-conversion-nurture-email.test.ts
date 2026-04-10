import { describe, expect, test } from "vitest";

import { buildTrialConversionNurtureEmail } from "./trial-conversion-nurture-email";
import type { ParentProfile } from "./mvp-types";

function buildProfile(programme: ParentProfile["student"]["programme"]): ParentProfile {
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
      createdAt: "2026-04-10T00:00:00.000Z",
      updatedAt: "2026-04-10T00:20:00.000Z",
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
    },
    student: {
      id: "student-1",
      parentId: "parent-1",
      studentName: programme === "MYP" ? "Mina" : "Theo",
      programme,
      programmeYear: programme === "DP" ? 1 : 4,
      interestTags: [],
      goodnotesEmail: "student@goodnotes.email",
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

describe("trial conversion nurture email", () => {
  test("builds stage 1 value reinforcement for DP families", () => {
    const email = buildTrialConversionNurtureEmail({
      profile: buildProfile("DP"),
      stageIndex: 1,
      notebookEntryCount: 2,
      weeklyRecapCount: 1,
    });

    expect(email.subject).toMatch(/first brief/i);
    expect(email.html).toContain("DP reading path");
    expect(email.html).toContain("2 notebook entries");
    expect(email.html).toContain("1 weekly recap");
    expect(email.text).toContain("/billing");
  });

  test("builds stage 2 reinforcement for MYP families", () => {
    const email = buildTrialConversionNurtureEmail({
      profile: buildProfile("MYP"),
      stageIndex: 2,
      notebookEntryCount: 0,
      weeklyRecapCount: 0,
    });

    expect(email.subject).toMatch(/keep/i);
    expect(email.html).toContain("MYP reading path");
    expect(email.html).toContain("Calm progress so far");
  });
});
