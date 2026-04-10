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
          email: "lead@example.com",
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
        email: "lead@example.com",
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
        token: "token-1",
        referrerParentId: "parent-1",
        referrerParentEmail: "parent@example.com",
        referrerParentFullName: "Parent Example",
        inviteeEmail: "friend@example.com",
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
    expect(markup).toContain("Starter kit");
    expect(markup).toContain("lead@example.com");
    expect(markup).toContain("friend@example.com");
  });
});
