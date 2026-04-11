import { describe, expect, test } from "vitest";

import { buildMarketingReportingSummary } from "./marketing-reporting";
import type { ParentProfile } from "./mvp-types";
import type { MarketingLeadRecord } from "./marketing-lead-store-types";
import type { MarketingReferralInviteRecord } from "./marketing-referral-store-types";

function createProfileFixture(
  overrides: Partial<ParentProfile["parent"]> = {},
  studentOverrides: Partial<ParentProfile["student"]> = {},
): ParentProfile {
  const parentId = overrides.id ?? "parent-1";

  return {
    parent: {
      id: parentId,
      email: overrides.email ?? "parent@families.hk",
      fullName: overrides.fullName ?? "Parent Example",
      countryCode: "HK",
      deliveryTimeZone: "Asia/Hong_Kong",
      preferredDeliveryLocalTime: "09:00",
      firstAuthenticatedAt: "2026-04-10T00:00:00.000Z",
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
      trialConversionNurtureCount: 0,
      trialConversionNurtureLastAttemptAt: null,
      trialConversionNurtureLastSentAt: null,
      trialConversionNurtureLastStage: null,
      trialConversionNurtureLastStatus: null,
      trialConversionNurtureLastMessageId: null,
      trialConversionNurtureLastError: null,
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
      updatedAt: "2026-04-10T00:00:00.000Z",
      ...overrides,
    },
    student: {
      id: `student-${parentId}`,
      parentId,
      studentName: "Student",
      programme: "MYP",
      programmeYear: 3,
      interestTags: [],
      goodnotesEmail: "",
      goodnotesConnected: false,
      goodnotesVerifiedAt: null,
      goodnotesLastTestSentAt: null,
      goodnotesLastDeliveryStatus: null,
      goodnotesLastDeliveryMessage: null,
      notionConnected: false,
      createdAt: "2026-04-10T00:00:00.000Z",
      updatedAt: "2026-04-10T00:00:00.000Z",
      ...studentOverrides,
    },
  };
}

function createLeadFixture(
  overrides: Partial<MarketingLeadRecord> = {},
): MarketingLeadRecord {
  return {
    id: "lead-1",
    email: "parent@families.hk",
    fullName: "Parent Example",
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
    deliveryStatus: "pending",
    deliveryMessageId: null,
    deliveryErrorMessage: null,
    deliveredAt: null,
    nurtureEmailCount: 0,
    nurtureLastAttemptAt: null,
    nurtureLastSentAt: null,
    nurtureLastStage: null,
    nurtureLastStatus: null,
    nurtureLastMessageId: null,
    nurtureLastError: null,
    createdAt: "2026-04-09T00:00:00.000Z",
    updatedAt: "2026-04-10T00:00:00.000Z",
    ...overrides,
  };
}

function createReferralInviteFixture(
  overrides: Partial<MarketingReferralInviteRecord> = {},
): MarketingReferralInviteRecord {
  return {
    id: "invite-1",
    token: "token-1",
    referrerParentId: "referrer-1",
    referrerParentEmail: "referrer@families.hk",
    referrerParentFullName: "Referrer Example",
    inviteeEmail: "parent@families.hk",
    inviteeFullName: "Parent Example",
    inviteeStageInterest: "MYP",
    sourcePath: "/dashboard/referrals",
    deliveryStatus: "sent",
    deliveryMessageId: null,
    deliveryErrorMessage: null,
    sentAt: "2026-04-09T00:00:00.000Z",
    acceptedAt: "2026-04-09T01:00:00.000Z",
    trialStartedAt: "2026-04-10T00:00:00.000Z",
    inviteeParentId: "parent-1",
    createdAt: "2026-04-09T00:00:00.000Z",
    updatedAt: "2026-04-10T00:00:00.000Z",
    ...overrides,
  };
}

describe("marketing reporting summary", () => {
  test("aggregates attribution, activation milestones, and referral lifecycle counts", () => {
    const summary = buildMarketingReportingSummary({
      leads: [
        createLeadFixture({
          id: "lead-1",
          email: "parent@families.hk",
          deliveryStatus: "sent",
          deliveryMessageId: "lead-message-1",
          deliveredAt: "2026-04-10T00:00:00.000Z",
          nurtureEmailCount: 2,
          nurtureLastAttemptAt: "2026-04-14T00:00:00.000Z",
          nurtureLastSentAt: "2026-04-14T00:00:00.000Z",
          nurtureLastStage: 2,
          nurtureLastStatus: "sent",
          nurtureLastMessageId: "nurture-message-2",
          updatedAt: "2026-04-14T00:00:00.000Z",
        }),
        createLeadFixture({
          id: "lead-2",
          email: "lead-two@families.hk",
          fullName: "Lead Two",
          childStageInterest: "DP",
          utmSource: "newsletter",
          utmMedium: "email",
          utmCampaign: "april-parents",
          deliveryStatus: "failed",
          deliveryErrorMessage: "SMTP offline",
          nurtureEmailCount: 1,
          nurtureLastAttemptAt: "2026-04-15T00:00:00.000Z",
          nurtureLastStage: 1,
          nurtureLastStatus: "failed",
          nurtureLastError: "SMTP offline",
          createdAt: "2026-04-11T00:00:00.000Z",
          updatedAt: "2026-04-15T00:00:00.000Z",
        }),
      ],
      referralInvites: [
        createReferralInviteFixture({
          id: "invite-1",
          token: "referral-code-1",
          referrerParentId: "parent-1",
          referrerParentEmail: "parent@families.hk",
          inviteeEmail: "friend@families.hk",
          inviteeFullName: "Friend Example",
          inviteeStageInterest: "DP",
          deliveryMessageId: "invite-message-1",
          sentAt: "2026-04-10T01:00:00.000Z",
          acceptedAt: "2026-04-10T02:00:00.000Z",
          trialStartedAt: "2026-04-10T03:00:00.000Z",
          inviteeParentId: "parent-2",
          createdAt: "2026-04-10T01:00:00.000Z",
          updatedAt: "2026-04-10T03:00:00.000Z",
        }),
      ],
      profiles: [
        createProfileFixture({
          id: "parent-1",
          email: "parent@families.hk",
          firstBriefDeliveredAt: "2026-04-10T00:20:00.000Z",
          updatedAt: "2026-04-10T00:20:00.000Z",
        }),
        createProfileFixture(
          {
            id: "parent-2",
            email: "friend@families.hk",
            fullName: "Friend Example",
            firstAuthenticatedAt: "2026-04-10T02:30:00.000Z",
            firstBriefDeliveredAt: "2026-04-10T03:30:00.000Z",
            firstPaidAt: "2026-04-12T00:00:00.000Z",
            subscriptionStatus: "active",
            subscriptionPlan: "yearly",
            stripeCustomerId: "cus_123",
            stripeSubscriptionId: "sub_123",
            trialStartedAt: "2026-04-10T02:30:00.000Z",
            trialEndsAt: "2026-04-17T02:30:00.000Z",
            subscriptionActivatedAt: "2026-04-12T00:00:00.000Z",
            subscriptionRenewalAt: "2027-04-12T00:00:00.000Z",
            latestInvoiceId: "in_123",
            latestInvoiceNumber: "123",
            latestInvoiceStatus: "paid",
            latestInvoiceAmountPaid: 12900,
            latestInvoiceCurrency: "usd",
            latestInvoicePaidAt: "2026-04-12T00:00:00.000Z",
            latestInvoicePeriodStart: "2026-04-12T00:00:00.000Z",
            latestInvoicePeriodEnd: "2027-04-12T00:00:00.000Z",
            updatedAt: "2026-04-12T00:00:00.000Z",
          },
          {
            studentName: "Theo",
            programme: "DP",
            programmeYear: 1,
            goodnotesEmail: "theo@goodnotes.email",
            goodnotesConnected: true,
            goodnotesVerifiedAt: "2026-04-10T02:40:00.000Z",
            goodnotesLastDeliveryStatus: "success",
            goodnotesLastDeliveryMessage: "Ready.",
            notionConnected: true,
          },
        ),
        createProfileFixture(
          {
            id: "parent-3",
            email: "direct@families.hk",
            fullName: "Direct Example",
            firstAuthenticatedAt: "2026-04-11T00:00:00.000Z",
            trialStartedAt: "2026-04-11T00:00:00.000Z",
            trialEndsAt: "2026-04-18T00:00:00.000Z",
            updatedAt: "2026-04-11T00:10:00.000Z",
          },
          {
            studentName: "Mina",
            programmeYear: 4,
          },
        ),
      ],
      notebookEntries: [
        {
          id: "entry-1",
          parentId: "parent-1",
          parentEmail: "parent@families.hk",
        },
        {
          id: "entry-2",
          parentId: "parent-1",
          parentEmail: "parent@families.hk",
        },
      ] as never[],
      weeklyRecaps: [
        {
          id: "recap-1",
          parentId: "parent-2",
          parentEmail: "friend@families.hk",
        },
      ] as never[],
    });

    expect(summary.exclusions).toEqual({
      profiles: 0,
      leads: 0,
      referralInvites: 0,
      notebookEntries: 0,
      weeklyRecaps: 0,
    });
    expect(summary.leads.total).toBe(2);
    expect(summary.leads.delivered).toBe(1);
    expect(summary.leads.nurtureSent).toBe(1);
    expect(summary.leads.nurtureFailed).toBe(1);
    expect(summary.activation.trialStarted).toBe(3);
    expect(summary.activation.firstBriefDelivered).toBe(2);
    expect(summary.activation.paidActivated).toBe(1);
    expect(summary.activation.notebookEntries).toBe(2);
    expect(summary.activation.weeklyRecaps).toBe(1);
    expect(summary.referrals.sent).toBe(1);
    expect(summary.referrals.accepted).toBe(1);
    expect(summary.referrals.trialStarted).toBe(1);
    expect(summary.attribution).toEqual([
      {
        source: "starter-kit",
        label: "Starter kit",
        profileCount: 1,
        trialStarted: 1,
        firstBriefDelivered: 1,
        paidActivated: 0,
      },
      {
        source: "referral",
        label: "Referral",
        profileCount: 1,
        trialStarted: 1,
        firstBriefDelivered: 1,
        paidActivated: 1,
      },
      {
        source: "direct",
        label: "Direct",
        profileCount: 1,
        trialStarted: 1,
        firstBriefDelivered: 0,
        paidActivated: 0,
      },
    ]);
    expect(summary.recentTrialProfiles[0]).toEqual(
      expect.objectContaining({
        parentEmail: "friend@families.hk",
        source: "referral",
        paidActivatedAt: "2026-04-12T00:00:00.000Z",
      }),
    );
  });

  test("excludes internal and test accounts from the reporting baseline", () => {
    const summary = buildMarketingReportingSummary({
      leads: [
        createLeadFixture({
          id: "lead-internal",
          email: "admin@geledtech.com",
        }),
        createLeadFixture({
          id: "lead-qa",
          email: "piaccte+dailysparks-acq-qa-20260410@gmail.com",
          utmSource: "qa",
          utmMedium: "manual",
          utmCampaign: "starter-kit-acquisition-qa-2026-04-10",
        }),
        createLeadFixture({
          id: "lead-external",
          email: "family@families.hk",
          fullName: "Family Example",
          childStageInterest: "DP",
          deliveryStatus: "sent",
          deliveryMessageId: "external-message",
          deliveredAt: "2026-04-10T00:00:00.000Z",
          nurtureEmailCount: 1,
          nurtureLastAttemptAt: "2026-04-10T00:00:00.000Z",
          nurtureLastSentAt: "2026-04-10T00:00:00.000Z",
          nurtureLastStage: 1,
          nurtureLastStatus: "sent",
          nurtureLastMessageId: "external-nurture",
        }),
      ],
      referralInvites: [
        createReferralInviteFixture({
          id: "invite-internal",
          token: "referral-code-internal",
          referrerParentId: "parent-internal",
          referrerParentEmail: "admin@geledtech.com",
          inviteeEmail: "friend@families.hk",
        }),
      ],
      profiles: [
        createProfileFixture({
          id: "parent-internal",
          email: "admin@geledtech.com",
          fullName: "Internal Admin",
          firstBriefDeliveredAt: "2026-04-10T01:00:00.000Z",
          firstPaidAt: "2026-04-10T02:00:00.000Z",
          subscriptionActivatedAt: "2026-04-10T02:00:00.000Z",
          trialConversionNurtureLastStage: 1,
          trialConversionNurtureLastStatus: "sent",
          updatedAt: "2026-04-10T02:00:00.000Z",
        }),
        createProfileFixture({
          id: "parent-qa",
          email: "piaccte+dailysparks-acq-qa-20260410@gmail.com",
          fullName: "Starter Kit QA",
        }),
        createProfileFixture(
          {
            id: "parent-external",
            email: "family@families.hk",
            fullName: "Family Example",
            firstBriefDeliveredAt: "2026-04-10T01:00:00.000Z",
            updatedAt: "2026-04-10T01:00:00.000Z",
          },
          {
            studentName: "Theo",
            programme: "DP",
          },
        ),
      ],
      notebookEntries: [
        {
          id: "entry-internal",
          parentId: "parent-internal",
          parentEmail: "admin@geledtech.com",
        },
        {
          id: "entry-qa",
          parentId: "parent-qa",
          parentEmail: "piaccte+dailysparks-acq-qa-20260410@gmail.com",
        },
        {
          id: "entry-external",
          parentId: "parent-external",
          parentEmail: "family@families.hk",
        },
      ] as never[],
      weeklyRecaps: [
        {
          id: "recap-internal",
          parentId: "parent-internal",
          parentEmail: "admin@geledtech.com",
        },
        {
          id: "recap-qa",
          parentId: "parent-qa",
          parentEmail: "piaccte+dailysparks-acq-qa-20260410@gmail.com",
        },
        {
          id: "recap-external",
          parentId: "parent-external",
          parentEmail: "family@families.hk",
        },
      ] as never[],
    });

    expect(summary.exclusions).toEqual({
      profiles: 2,
      leads: 2,
      referralInvites: 1,
      notebookEntries: 2,
      weeklyRecaps: 2,
    });
    expect(summary.leads.total).toBe(1);
    expect(summary.referrals.sent).toBe(0);
    expect(summary.activation.trialStarted).toBe(1);
    expect(summary.activation.firstBriefDelivered).toBe(1);
    expect(summary.activation.paidActivated).toBe(0);
    expect(summary.activation.notebookEntries).toBe(1);
    expect(summary.activation.weeklyRecaps).toBe(1);
    expect(summary.attribution).toEqual([
      {
        source: "starter-kit",
        label: "Starter kit",
        profileCount: 1,
        trialStarted: 1,
        firstBriefDelivered: 1,
        paidActivated: 0,
      },
      {
        source: "referral",
        label: "Referral",
        profileCount: 0,
        trialStarted: 0,
        firstBriefDelivered: 0,
        paidActivated: 0,
      },
      {
        source: "direct",
        label: "Direct",
        profileCount: 0,
        trialStarted: 0,
        firstBriefDelivered: 0,
        paidActivated: 0,
      },
    ]);
    expect(summary.recentLeads).toEqual([
      expect.objectContaining({
        email: "family@families.hk",
      }),
    ]);
    expect(summary.recentTrialProfiles).toEqual([
      expect.objectContaining({
        parentEmail: "family@families.hk",
      }),
    ]);
  });

  test("prefers a persisted acquisition snapshot over legacy heuristic matches", () => {
    const summary = buildMarketingReportingSummary({
      leads: [createLeadFixture()],
      referralInvites: [
        createReferralInviteFixture({
          inviteeParentId: "parent-1",
        }),
      ],
      profiles: [
        createProfileFixture({
          id: "parent-1",
          email: "parent@families.hk",
          acquisitionSource: "direct",
          acquisitionCapturedAt: "2026-04-10T00:00:00.000Z",
          acquisitionLeadId: null,
          acquisitionReferralInviteId: null,
          acquisitionPagePath: null,
          acquisitionReferrerUrl: null,
          acquisitionUtmSource: null,
          acquisitionUtmMedium: null,
          acquisitionUtmCampaign: null,
          acquisitionUtmContent: null,
          acquisitionUtmTerm: null,
        }),
      ],
      notebookEntries: [],
      weeklyRecaps: [],
    });

    expect(summary.attribution).toEqual([
      {
        source: "starter-kit",
        label: "Starter kit",
        profileCount: 0,
        trialStarted: 0,
        firstBriefDelivered: 0,
        paidActivated: 0,
      },
      {
        source: "referral",
        label: "Referral",
        profileCount: 0,
        trialStarted: 0,
        firstBriefDelivered: 0,
        paidActivated: 0,
      },
      {
        source: "direct",
        label: "Direct",
        profileCount: 1,
        trialStarted: 1,
        firstBriefDelivered: 0,
        paidActivated: 0,
      },
    ]);
    expect(summary.recentTrialProfiles[0]?.source).toBe("direct");
  });

  test("falls back to the legacy heuristic when no acquisition snapshot exists", () => {
    const summary = buildMarketingReportingSummary({
      leads: [
        createLeadFixture({
          email: "legacy@families.hk",
        }),
      ],
      referralInvites: [],
      profiles: [
        createProfileFixture({
          id: "parent-legacy",
          email: "legacy@families.hk",
        }),
      ],
      notebookEntries: [],
      weeklyRecaps: [],
    });

    expect(summary.attribution).toEqual([
      {
        source: "starter-kit",
        label: "Starter kit",
        profileCount: 1,
        trialStarted: 1,
        firstBriefDelivered: 0,
        paidActivated: 0,
      },
      {
        source: "referral",
        label: "Referral",
        profileCount: 0,
        trialStarted: 0,
        firstBriefDelivered: 0,
        paidActivated: 0,
      },
      {
        source: "direct",
        label: "Direct",
        profileCount: 0,
        trialStarted: 0,
        firstBriefDelivered: 0,
        paidActivated: 0,
      },
    ]);
  });
});
