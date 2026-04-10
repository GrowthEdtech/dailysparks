import { describe, expect, test } from "vitest";

import { buildMarketingReportingSummary } from "./marketing-reporting";

describe("marketing reporting summary", () => {
  test("aggregates leads, activation milestones, and referral lifecycle counts", () => {
    const summary = buildMarketingReportingSummary({
      leads: [
        {
          id: "lead-1",
          email: "lead@example.com",
          fullName: "Lead Example",
          childStageInterest: "MYP",
          source: "ib-parent-starter-kit",
          pagePath: "/ib-parent-starter-kit",
          referrerUrl: null,
          utmSource: "google",
          utmMedium: "organic",
          utmCampaign: null,
          utmContent: null,
          utmTerm: null,
          captureCount: 1,
          deliveryStatus: "sent",
          deliveryMessageId: "lead-message-1",
          deliveryErrorMessage: null,
          deliveredAt: "2026-04-10T00:00:00.000Z",
          nurtureEmailCount: 2,
          nurtureLastAttemptAt: "2026-04-14T00:00:00.000Z",
          nurtureLastSentAt: "2026-04-14T00:00:00.000Z",
          nurtureLastStage: 2,
          nurtureLastStatus: "sent",
          nurtureLastMessageId: "nurture-message-2",
          nurtureLastError: null,
          createdAt: "2026-04-10T00:00:00.000Z",
          updatedAt: "2026-04-14T00:00:00.000Z",
        },
      ],
      referralInvites: [
        {
          id: "invite-1",
          token: "token-1",
          referrerParentId: "parent-1",
          referrerParentEmail: "parent@example.com",
          referrerParentFullName: "Parent Example",
          inviteeEmail: "friend@example.com",
          inviteeFullName: "Friend Example",
          inviteeStageInterest: "DP",
          sourcePath: "/dashboard",
          deliveryStatus: "sent",
          deliveryMessageId: "invite-message-1",
          deliveryErrorMessage: null,
          sentAt: "2026-04-10T01:00:00.000Z",
          acceptedAt: "2026-04-10T02:00:00.000Z",
          trialStartedAt: "2026-04-10T03:00:00.000Z",
          inviteeParentId: "parent-2",
          createdAt: "2026-04-10T01:00:00.000Z",
          updatedAt: "2026-04-10T03:00:00.000Z",
        },
      ],
      profiles: [
        {
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
          },
          student: {
            id: "student-1",
            parentId: "parent-1",
            studentName: "Katherine",
            programme: "MYP",
            programmeYear: 3,
            interestTags: [],
            goodnotesEmail: "katherine@goodnotes.email",
            goodnotesConnected: true,
            goodnotesVerifiedAt: "2026-04-10T00:10:00.000Z",
            goodnotesLastTestSentAt: null,
            goodnotesLastDeliveryStatus: "success",
            goodnotesLastDeliveryMessage: "Ready.",
            notionConnected: false,
            createdAt: "2026-04-10T00:00:00.000Z",
            updatedAt: "2026-04-10T00:20:00.000Z",
          },
        },
      ],
      notebookEntryCount: 2,
      weeklyRecapCount: 1,
    });

    expect(summary.leads.total).toBe(1);
    expect(summary.leads.delivered).toBe(1);
    expect(summary.leads.nurtureSent).toBe(1);
    expect(summary.leads.nurtureFailed).toBe(0);
    expect(summary.activation.trialStarted).toBe(1);
    expect(summary.activation.firstBriefDelivered).toBe(1);
    expect(summary.activation.notebookEntries).toBe(2);
    expect(summary.activation.weeklyRecaps).toBe(1);
    expect(summary.referrals.sent).toBe(1);
    expect(summary.referrals.accepted).toBe(1);
    expect(summary.referrals.trialStarted).toBe(1);
  });
});
