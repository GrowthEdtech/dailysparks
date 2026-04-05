import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

const { listDailyBriefHistoryMock } = vi.hoisted(() => ({
  listDailyBriefHistoryMock: vi.fn(),
}));
const { listParentProfilesMock } = vi.hoisted(() => ({
  listParentProfilesMock: vi.fn(),
}));

vi.mock("../../../../lib/daily-brief-history-store", () => ({
  listDailyBriefHistory: listDailyBriefHistoryMock,
}));

vi.mock("../../../../lib/mvp-store", () => ({
  listParentProfiles: listParentProfilesMock,
}));

vi.mock("../../../../lib/daily-brief-run-date", () => ({
  getDailyBriefBusinessDate: () => "2026-04-03",
}));

import DailyBriefsAdminPage from "./page";

describe("DailyBriefsAdminPage", () => {
  beforeEach(() => {
    listDailyBriefHistoryMock.mockReset();
    listParentProfilesMock.mockReset();
    process.env = { ...ORIGINAL_ENV };
  });

  test("renders an honest empty state when no daily briefs exist", async () => {
    listDailyBriefHistoryMock.mockResolvedValue([]);
    listParentProfilesMock.mockResolvedValue([]);

    const markup = renderToStaticMarkup(
      await DailyBriefsAdminPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain("No daily briefs recorded yet");
    expect(markup).toContain("Generation history will appear here");
    expect(listDailyBriefHistoryMock).toHaveBeenNthCalledWith(1, {
      programme: undefined,
      recordKind: "production",
      status: undefined,
    });
    expect(listDailyBriefHistoryMock).toHaveBeenNthCalledWith(2, {
      scheduledFor: "2026-04-03",
      recordKind: "production",
    });
  });

  test("renders recorded daily briefs when history exists", async () => {
    listDailyBriefHistoryMock
      .mockResolvedValueOnce([
        {
          id: "brief-1",
          scheduledFor: "2026-04-02",
          recordKind: "production",
          headline: "Students debate how cities should respond to rising heat.",
          summary: "A climate brief.",
          programme: "MYP",
          status: "published",
          topicTags: ["climate"],
          sourceReferences: [
            {
              sourceId: "reuters",
              sourceName: "Reuters",
              sourceDomain: "reuters.com",
              articleTitle: "Cities test new heat protections",
              articleUrl: "https://www.reuters.com/world/example-heat-story",
            },
          ],
          aiConnectionId: "nf-relay",
          aiConnectionName: "NF Relay",
          aiModel: "gpt-5.4",
          promptPolicyId: "policy-1",
          promptVersionLabel: "v1.0.0",
          promptVersion: "v1.0.0",
          repetitionRisk: "low",
          repetitionNotes: "No similar brief.",
          adminNotes: "",
          briefMarkdown: "## Today",
          pipelineStage: "preflight_passed",
          candidateSnapshotAt: "2026-04-02T05:00:00.000Z",
          generationCompletedAt: "2026-04-02T06:00:00.000Z",
          pdfBuiltAt: "2026-04-02T06:05:00.000Z",
          deliveryWindowAt: "2026-04-02T09:00:00.000Z",
          lastDeliveryAttemptAt: "2026-04-02T09:00:00.000Z",
          deliveryAttemptCount: 1,
          deliverySuccessCount: 12,
          deliveryFailureCount: 0,
          deliveryReceipts: [],
          failedDeliveryTargets: [],
          failureReason: "",
          retryEligibleUntil: null,
          createdAt: "2026-04-02T00:00:00.000Z",
          updatedAt: "2026-04-02T00:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([]);
    listParentProfilesMock.mockResolvedValue([]);

    const markup = renderToStaticMarkup(
      await DailyBriefsAdminPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain(
      "Students debate how cities should respond to rising heat.",
    );
    expect(markup).toContain("Reuters");
    expect(markup).toContain("gpt-5.4");
    expect(markup).toContain("v1.0.0");
    expect(markup).toContain("Preflight passed");
    expect(markup).toContain("12 delivered");
    expect(markup).toContain("/admin/editorial/daily-briefs/brief-1");
  });

  test("renders a visible test-run badge when a test brief is present", async () => {
    listDailyBriefHistoryMock
      .mockResolvedValueOnce([
        {
          id: "brief-test-1",
          scheduledFor: "2026-04-02",
          recordKind: "test",
          headline: "Test rehearsal brief",
          summary: "A canary rehearsal summary.",
          programme: "PYP",
          status: "published",
          topicTags: ["rehearsal"],
          sourceReferences: [],
          aiConnectionId: "nf-relay",
          aiConnectionName: "NF Relay",
          aiModel: "gpt-5.4",
          promptPolicyId: "policy-1",
          promptVersionLabel: "v1.1.1",
          promptVersion: "v1.1.1",
          repetitionRisk: "low",
          repetitionNotes: "No similar brief.",
          adminNotes: "",
          briefMarkdown: "## Today",
          pipelineStage: "published",
          candidateSnapshotAt: "2026-04-02T05:00:00.000Z",
          generationCompletedAt: "2026-04-02T06:00:00.000Z",
          pdfBuiltAt: "2026-04-02T06:05:00.000Z",
          deliveryWindowAt: "2026-04-02T09:00:00.000Z",
          lastDeliveryAttemptAt: "2026-04-02T09:00:00.000Z",
          deliveryAttemptCount: 1,
          deliverySuccessCount: 1,
          deliveryFailureCount: 0,
          deliveryReceipts: [],
          failedDeliveryTargets: [],
          failureReason: "",
          retryEligibleUntil: null,
          createdAt: "2026-04-02T00:00:00.000Z",
          updatedAt: "2026-04-02T00:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([]);
    listParentProfilesMock.mockResolvedValue([]);

    const markup = renderToStaticMarkup(
      await DailyBriefsAdminPage({
        searchParams: Promise.resolve({
          kind: "test",
        }),
      }),
    );

    expect(markup).toContain("Test run");
    expect(listDailyBriefHistoryMock).toHaveBeenNthCalledWith(1, {
      programme: undefined,
      recordKind: "test",
      status: undefined,
    });
    expect(listDailyBriefHistoryMock).toHaveBeenNthCalledWith(2, {
      scheduledFor: "2026-04-03",
      recordKind: "production",
    });
  });

  test("shows a production canary warning banner when dispatch mode is limited", async () => {
    process.env.DAILY_BRIEF_DELIVERY_MODE = "canary";
    process.env.DAILY_BRIEF_CANARY_PARENT_EMAILS =
      "deploy-smoke@example.com,admin@geledtech.com";
    listDailyBriefHistoryMock.mockResolvedValue([]);
    listParentProfilesMock.mockResolvedValue([]);

    const markup = renderToStaticMarkup(
      await DailyBriefsAdminPage({
        searchParams: Promise.resolve({
          kind: "production",
        }),
      }),
    );

    expect(markup).toContain("Production delivery is currently limited to canary recipients.");
    expect(markup).toContain("deploy-smoke@example.com");
    expect(markup).toContain("admin@geledtech.com");
  });

  test("stacks programme and status filters vertically at every width", async () => {
    listDailyBriefHistoryMock.mockResolvedValue([]);
    listParentProfilesMock.mockResolvedValue([]);

    const markup = renderToStaticMarkup(
      await DailyBriefsAdminPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain("flex flex-col gap-4");
    expect(markup).not.toContain("md:grid-cols-2");
  });

  test("renders the manual canary test panel copy", async () => {
    listDailyBriefHistoryMock.mockResolvedValue([]);
    listParentProfilesMock.mockResolvedValue([]);

    const markup = renderToStaticMarkup(
      await DailyBriefsAdminPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain("Manual canary test");
    expect(markup).toContain("Test recipient");
    expect(markup).toContain("Use any existing family email as the one-off canary target");
    expect(markup).toContain("Run staged test");
  });

  test("uses higher-contrast styling for inactive filter chips", async () => {
    listDailyBriefHistoryMock.mockResolvedValue([]);
    listParentProfilesMock.mockResolvedValue([]);

    const markup = renderToStaticMarkup(
      await DailyBriefsAdminPage({
        searchParams: Promise.resolve({
          kind: "production",
        }),
      }),
    );

    expect(markup).toContain('style="color:#0f172a"');
    expect(markup).toContain("bg-white text-[#0f172a] shadow-sm");
    expect(markup).toContain("hover:border-slate-400");
    expect(markup).toContain("hover:bg-slate-100");
    expect(markup).not.toContain("bg-slate-50 text-slate-600");
  });

  test("renders a daily reconciliation summary with skipped families and channel watchlist", async () => {
    listDailyBriefHistoryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "brief-ops-1",
          scheduledFor: "2026-04-03",
          recordKind: "production",
          headline: "Students explore new cooling rooms.",
          summary: "A climate brief.",
          programme: "PYP",
          status: "published",
          topicTags: ["climate"],
          sourceReferences: [],
          aiConnectionId: "nf-relay",
          aiConnectionName: "NF Relay",
          aiModel: "gpt-5.4",
          promptPolicyId: "policy-1",
          promptVersionLabel: "v1.1.1",
          promptVersion: "v1.1.1",
          repetitionRisk: "low",
          repetitionNotes: "No similar brief.",
          adminNotes: "",
          briefMarkdown: "## Today",
          pipelineStage: "published",
          candidateSnapshotAt: "2026-04-03T05:00:00.000Z",
          generationCompletedAt: "2026-04-03T06:00:00.000Z",
          pdfBuiltAt: "2026-04-03T06:05:00.000Z",
          deliveryWindowAt: "2026-04-03T09:00:00.000Z",
          lastDeliveryAttemptAt: "2026-04-03T09:00:00.000Z",
          deliveryAttemptCount: 1,
          deliverySuccessCount: 1,
          deliveryFailureCount: 0,
          deliveryReceipts: [
            {
              parentId: "parent-healthy",
              parentEmail: "healthy@example.com",
              channel: "goodnotes",
              attachmentFileName: "healthy.pdf",
              externalId: "smtp-1",
              externalUrl: null,
            },
          ],
          failedDeliveryTargets: [],
          failureReason: "",
          retryEligibleUntil: null,
          createdAt: "2026-04-03T00:00:00.000Z",
          updatedAt: "2026-04-03T00:00:00.000Z",
        },
        {
          id: "brief-ops-2",
          scheduledFor: "2026-04-03",
          recordKind: "production",
          headline: "Transit disruption pauses school arrival.",
          summary: "A transport brief.",
          programme: "MYP",
          status: "failed",
          topicTags: ["transport"],
          sourceReferences: [],
          aiConnectionId: "nf-relay",
          aiConnectionName: "NF Relay",
          aiModel: "gpt-5.4",
          promptPolicyId: "policy-1",
          promptVersionLabel: "v1.1.1",
          promptVersion: "v1.1.1",
          repetitionRisk: "low",
          repetitionNotes: "No similar brief.",
          adminNotes: "",
          briefMarkdown: "## Today",
          pipelineStage: "failed",
          candidateSnapshotAt: "2026-04-03T05:00:00.000Z",
          generationCompletedAt: "2026-04-03T06:00:00.000Z",
          pdfBuiltAt: "2026-04-03T06:05:00.000Z",
          deliveryWindowAt: "2026-04-03T09:00:00.000Z",
          lastDeliveryAttemptAt: null,
          deliveryAttemptCount: 0,
          deliverySuccessCount: 0,
          deliveryFailureCount: 0,
          deliveryReceipts: [],
          failedDeliveryTargets: [],
          failureReason: "Source validation failed.",
          retryEligibleUntil: null,
          createdAt: "2026-04-03T00:00:00.000Z",
          updatedAt: "2026-04-03T00:00:00.000Z",
        },
      ]);
    listParentProfilesMock.mockResolvedValue([
      {
        parent: {
          id: "parent-healthy",
          email: "healthy@example.com",
          fullName: "Healthy Family",
          countryCode: "HK",
          deliveryTimeZone: "Asia/Hong_Kong",
          preferredDeliveryLocalTime: "09:00",
          subscriptionStatus: "active",
          subscriptionPlan: "monthly",
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          trialStartedAt: "2026-04-01T00:00:00.000Z",
          trialEndsAt: "2026-04-08T00:00:00.000Z",
          subscriptionActivatedAt: "2026-04-01T00:00:00.000Z",
          subscriptionRenewalAt: "2026-05-01T00:00:00.000Z",
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
        },
        student: {
          id: "student-healthy",
          parentId: "parent-healthy",
          studentName: "Harper",
          programme: "PYP",
          programmeYear: 5,
          goodnotesEmail: "harper@goodnotes.email",
          goodnotesConnected: true,
          goodnotesVerifiedAt: "2026-04-01T00:00:00.000Z",
          goodnotesLastTestSentAt: "2026-04-01T00:00:00.000Z",
          goodnotesLastDeliveryStatus: "success",
          goodnotesLastDeliveryMessage: "Delivered.",
          notionConnected: false,
          createdAt: "2026-04-01T00:00:00.000Z",
          updatedAt: "2026-04-01T00:00:00.000Z",
        },
      },
      {
        parent: {
          id: "parent-attention",
          email: "attention@example.com",
          fullName: "Attention Family",
          countryCode: "US",
          deliveryTimeZone: "America/New_York",
          preferredDeliveryLocalTime: "09:00",
          subscriptionStatus: "active",
          subscriptionPlan: "monthly",
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          trialStartedAt: "2026-04-01T00:00:00.000Z",
          trialEndsAt: "2026-04-08T00:00:00.000Z",
          subscriptionActivatedAt: "2026-04-01T00:00:00.000Z",
          subscriptionRenewalAt: "2026-05-01T00:00:00.000Z",
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
        },
        student: {
          id: "student-attention",
          parentId: "parent-attention",
          studentName: "Ava",
          programme: "PYP",
          programmeYear: 5,
          goodnotesEmail: "ava@goodnotes.email",
          goodnotesConnected: true,
          goodnotesVerifiedAt: "2026-04-01T00:00:00.000Z",
          goodnotesLastTestSentAt: "2026-04-01T00:00:00.000Z",
          goodnotesLastDeliveryStatus: "failed",
          goodnotesLastDeliveryMessage: "Relay timeout.",
          notionConnected: false,
          createdAt: "2026-04-01T00:00:00.000Z",
          updatedAt: "2026-04-01T00:00:00.000Z",
        },
      },
      {
        parent: {
          id: "parent-verification",
          email: "verification@example.com",
          fullName: "Verification Family",
          countryCode: "GB",
          deliveryTimeZone: "Europe/London",
          preferredDeliveryLocalTime: "09:00",
          subscriptionStatus: "active",
          subscriptionPlan: "monthly",
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          trialStartedAt: "2026-04-01T00:00:00.000Z",
          trialEndsAt: "2026-04-08T00:00:00.000Z",
          subscriptionActivatedAt: "2026-04-01T00:00:00.000Z",
          subscriptionRenewalAt: "2026-05-01T00:00:00.000Z",
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
          notionWorkspaceId: "workspace-1",
          notionWorkspaceName: "Family Workspace",
          notionBotId: "bot-1",
          notionDatabaseId: "db-1",
          notionDatabaseName: "Daily Sparks",
          notionDataSourceId: "source-1",
          notionAuthorizedAt: "2026-04-01T00:00:00.000Z",
          notionLastSyncedAt: null,
          notionLastSyncStatus: null,
          notionLastSyncMessage: null,
          notionLastSyncPageId: null,
          notionLastSyncPageUrl: null,
          createdAt: "2026-04-01T00:00:00.000Z",
          updatedAt: "2026-04-01T00:00:00.000Z",
        },
        student: {
          id: "student-verification",
          parentId: "parent-verification",
          studentName: "Milo",
          programme: "MYP",
          programmeYear: 3,
          goodnotesEmail: "",
          goodnotesConnected: false,
          goodnotesVerifiedAt: null,
          goodnotesLastTestSentAt: null,
          goodnotesLastDeliveryStatus: null,
          goodnotesLastDeliveryMessage: null,
          notionConnected: false,
          createdAt: "2026-04-01T00:00:00.000Z",
          updatedAt: "2026-04-01T00:00:00.000Z",
        },
      },
    ]);

    const markup = renderToStaticMarkup(
      await DailyBriefsAdminPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain("Today&#x27;s ops summary");
    expect(markup).toContain("Attention required today");
    expect(markup).toContain("Skipped families");
    expect(markup).toContain("Channel watchlist");
    expect(markup).toContain("Briefs needing follow-up");
    expect(markup).toContain("attention@example.com");
    expect(markup).toContain("verification@example.com");
    expect(markup).toContain("Goodnotes needs attention");
    expect(markup).toContain("Notion verification needed");
    expect(markup).toContain("Local delivery window");
    expect(markup).toContain("9:00 AM · America/New York");
    expect(markup).toContain("9:00 AM · Europe/London");
    expect(markup).toContain("Source validation failed.");
  });
});
