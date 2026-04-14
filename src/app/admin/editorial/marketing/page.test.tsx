import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { listParentProfilesMock } = vi.hoisted(() => ({
  listParentProfilesMock: vi.fn(),
}));

vi.mock("../../../../lib/mvp-store", () => ({
  listParentProfiles: listParentProfilesMock,
}));

const { listMarketingLeadsMock } = vi.hoisted(() => ({
  listMarketingLeadsMock: vi.fn(),
}));

vi.mock("../../../../lib/marketing-lead-store", () => ({
  listMarketingLeads: listMarketingLeadsMock,
}));

const { listMarketingReferralInvitesMock } = vi.hoisted(() => ({
  listMarketingReferralInvitesMock: vi.fn(),
}));

vi.mock("../../../../lib/marketing-referral-store", () => ({
  listMarketingReferralInvites: listMarketingReferralInvitesMock,
}));

const { listDailyBriefNotebookEntriesMock } = vi.hoisted(() => ({
  listDailyBriefNotebookEntriesMock: vi.fn(),
}));

vi.mock("../../../../lib/daily-brief-notebook-store", () => ({
  listDailyBriefNotebookEntries: listDailyBriefNotebookEntriesMock,
}));

const { listDailyBriefNotebookWeeklyRecapsMock } = vi.hoisted(() => ({
  listDailyBriefNotebookWeeklyRecapsMock: vi.fn(),
}));

vi.mock("../../../../lib/daily-brief-notebook-weekly-recap-store", () => ({
  listDailyBriefNotebookWeeklyRecaps: listDailyBriefNotebookWeeklyRecapsMock,
}));

import MarketingAdminPage from "./page";

const REFERRAL_TOKEN_KEY = "token";

describe("MarketingAdminPage", () => {
  beforeEach(() => {
    listParentProfilesMock.mockReset();
    listMarketingLeadsMock.mockReset();
    listMarketingReferralInvitesMock.mockReset();
    listDailyBriefNotebookEntriesMock.mockReset();
    listDailyBriefNotebookWeeklyRecapsMock.mockReset();
  });

  test("renders marketing funnel metrics and recent activity", async () => {
    listParentProfilesMock.mockResolvedValue([
      {
        parent: {
          id: "parent-1",
          email: "lead@families.hk",
          fullName: "Lead Example",
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
          trialConversionNurtureCount: 1,
          trialConversionNurtureLastAttemptAt: "2026-04-11T00:00:00.000Z",
          trialConversionNurtureLastSentAt: "2026-04-11T00:00:00.000Z",
          trialConversionNurtureLastStage: 1,
          trialConversionNurtureLastStatus: "sent",
          trialConversionNurtureLastMessageId: "trial-message-1",
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
          updatedAt: "2026-04-11T00:00:00.000Z",
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
          updatedAt: "2026-04-11T00:00:00.000Z",
        },
      },
    ]);
    listMarketingLeadsMock.mockResolvedValue([
      {
        id: "lead-1",
        email: "lead@families.hk",
        fullName: "Lead Example",
        childStageInterest: "DP",
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
        deliveryMessageId: "message-1",
        deliveryErrorMessage: null,
        deliveredAt: "2026-04-10T00:00:00.000Z",
        nurtureEmailCount: 1,
        nurtureLastAttemptAt: "2026-04-11T00:00:00.000Z",
        nurtureLastSentAt: "2026-04-11T00:00:00.000Z",
        nurtureLastStage: 1,
        nurtureLastStatus: "sent",
        nurtureLastMessageId: "message-3",
        nurtureLastError: null,
        createdAt: "2026-04-10T00:00:00.000Z",
        updatedAt: "2026-04-11T00:00:00.000Z",
      },
    ]);
    listMarketingReferralInvitesMock.mockResolvedValue([
      {
        id: "invite-1",
        [REFERRAL_TOKEN_KEY]: "referral-code-1",
        referrerParentId: "parent-1",
        referrerParentEmail: "lead@families.hk",
        referrerParentFullName: "Parent Example",
        inviteeEmail: "friend@families.hk",
        inviteeFullName: "Friend Example",
        inviteeStageInterest: "DP",
        sourcePath: "/dashboard",
        deliveryStatus: "sent",
        deliveryMessageId: "message-2",
        deliveryErrorMessage: null,
        sentAt: "2026-04-10T01:00:00.000Z",
        acceptedAt: "2026-04-10T02:00:00.000Z",
        trialStartedAt: null,
        inviteeParentId: null,
        createdAt: "2026-04-10T01:00:00.000Z",
        updatedAt: "2026-04-10T02:00:00.000Z",
      },
    ]);
    listDailyBriefNotebookEntriesMock.mockResolvedValue([]);
    listDailyBriefNotebookWeeklyRecapsMock.mockResolvedValue([]);

    const markup = renderToStaticMarkup(await MarketingAdminPage());

    expect(markup).toContain("Marketing");
    expect(markup).toContain("Leads");
    expect(markup).toContain("Referral invites");
    expect(markup).toContain("Recent leads");
    expect(markup).toContain("Nurture");
    expect(markup).toContain("Acquisition sources");
    expect(markup).toContain("Paid activated");
    expect(markup).toContain("Recent trial families");
    expect(markup).toContain("Homepage baseline watch");
    expect(markup).toContain("landing_page_viewed");
    expect(markup).toContain("landing_section_viewed");
    expect(markup).toContain("landing_scroll_depth_reached");
    expect(markup).toContain("Starter kit");
    expect(markup).toContain("Internal/test accounts are excluded from this baseline");
    expect(markup).toContain("Homepage baseline events are now live in GA4");
    expect(markup).toContain("lead@families.hk");
    expect(markup).toContain("friend@families.hk");
  });

  test("hides internal and test accounts from the rendered baseline", async () => {
    listParentProfilesMock.mockResolvedValue([
      {
        parent: {
          id: "parent-internal",
          email: "admin@geledtech.com",
          fullName: "Internal Admin",
          trialStartedAt: "2026-04-10T00:00:00.000Z",
          firstBriefDeliveredAt: "2026-04-10T00:20:00.000Z",
          firstPaidAt: "2026-04-10T01:00:00.000Z",
          subscriptionActivatedAt: "2026-04-10T01:00:00.000Z",
          trialConversionNurtureLastStage: 1,
          trialConversionNurtureLastStatus: "sent",
          updatedAt: "2026-04-10T01:00:00.000Z",
        },
        student: {
          studentName: "Internal Student",
          programme: "DP",
        },
      },
      {
        parent: {
          id: "parent-external",
          email: "family@families.hk",
          fullName: "Family Example",
          trialStartedAt: "2026-04-10T00:00:00.000Z",
          firstBriefDeliveredAt: "2026-04-10T00:20:00.000Z",
          firstPaidAt: null,
          subscriptionActivatedAt: null,
          trialConversionNurtureLastStage: null,
          trialConversionNurtureLastStatus: null,
          updatedAt: "2026-04-10T00:20:00.000Z",
        },
        student: {
          studentName: "Theo",
          programme: "DP",
        },
      },
    ]);
    listMarketingLeadsMock.mockResolvedValue([
      {
        id: "lead-internal",
        email: "admin@geledtech.com",
        fullName: "Internal Admin",
        childStageInterest: "DP",
        source: "ib-parent-starter-kit",
        pagePath: "/ib-parent-starter-kit",
        referrerUrl: null,
        utmSource: "manual",
        utmMedium: "internal",
        utmCampaign: null,
        utmContent: null,
        utmTerm: null,
        captureCount: 1,
        deliveryStatus: "sent",
        deliveryMessageId: "message-internal",
        deliveryErrorMessage: null,
        deliveredAt: "2026-04-10T00:00:00.000Z",
        nurtureEmailCount: 1,
        nurtureLastAttemptAt: "2026-04-10T00:00:00.000Z",
        nurtureLastSentAt: "2026-04-10T00:00:00.000Z",
        nurtureLastStage: 1,
        nurtureLastStatus: "sent",
        nurtureLastMessageId: "message-internal",
        nurtureLastError: null,
        createdAt: "2026-04-10T00:00:00.000Z",
        updatedAt: "2026-04-10T00:00:00.000Z",
      },
      {
        id: "lead-external",
        email: "family@families.hk",
        fullName: "Family Example",
        childStageInterest: "DP",
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
        deliveryMessageId: "message-external",
        deliveryErrorMessage: null,
        deliveredAt: "2026-04-10T00:00:00.000Z",
        nurtureEmailCount: 1,
        nurtureLastAttemptAt: "2026-04-10T00:00:00.000Z",
        nurtureLastSentAt: "2026-04-10T00:00:00.000Z",
        nurtureLastStage: 1,
        nurtureLastStatus: "sent",
        nurtureLastMessageId: "message-external",
        nurtureLastError: null,
        createdAt: "2026-04-10T00:00:00.000Z",
        updatedAt: "2026-04-10T00:00:00.000Z",
      },
    ]);
    listMarketingReferralInvitesMock.mockResolvedValue([
      {
        id: "invite-internal",
        [REFERRAL_TOKEN_KEY]: "referral-code-internal",
        referrerParentId: "parent-internal",
        referrerParentEmail: "admin@geledtech.com",
        referrerParentFullName: "Internal Admin",
        inviteeEmail: "friend@families.hk",
        inviteeFullName: "Friend Example",
        inviteeStageInterest: "DP",
        sourcePath: "/dashboard",
        deliveryStatus: "sent",
        deliveryMessageId: "message-2",
        deliveryErrorMessage: null,
        sentAt: "2026-04-10T01:00:00.000Z",
        acceptedAt: "2026-04-10T02:00:00.000Z",
        trialStartedAt: null,
        inviteeParentId: null,
        createdAt: "2026-04-10T01:00:00.000Z",
        updatedAt: "2026-04-10T02:00:00.000Z",
      },
    ]);
    listDailyBriefNotebookEntriesMock.mockResolvedValue([]);
    listDailyBriefNotebookWeeklyRecapsMock.mockResolvedValue([]);

    const markup = renderToStaticMarkup(await MarketingAdminPage());

    expect(markup).toContain("1 profiles, 1 leads, 1 referral invites");
    expect(markup).toContain("family@families.hk");
    expect(markup).not.toContain("admin@geledtech.com");
  });
});
