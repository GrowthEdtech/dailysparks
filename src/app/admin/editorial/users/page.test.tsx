import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { refreshMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

const { listParentProfilesMock } = vi.hoisted(() => ({
  listParentProfilesMock: vi.fn(),
}));

vi.mock("../../../../lib/mvp-store", () => ({
  listParentProfiles: listParentProfilesMock,
}));

const { listOnboardingReminderRunHistoryMock } = vi.hoisted(() => ({
  listOnboardingReminderRunHistoryMock: vi.fn(),
}));

vi.mock("../../../../lib/onboarding-reminder-history-store", () => ({
  listOnboardingReminderRunHistory: listOnboardingReminderRunHistoryMock,
}));

const { listPlannedNotificationRunHistoryMock } = vi.hoisted(() => ({
  listPlannedNotificationRunHistoryMock: vi.fn(),
}));

vi.mock("../../../../lib/planned-notification-history-store", () => ({
  listPlannedNotificationRunHistory: listPlannedNotificationRunHistoryMock,
}));

import UsersAdminPage from "./page";

describe("UsersAdminPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-05T12:00:00.000Z"));
    listParentProfilesMock.mockReset();
    listOnboardingReminderRunHistoryMock.mockReset();
    listOnboardingReminderRunHistoryMock.mockResolvedValue([]);
    listPlannedNotificationRunHistoryMock.mockReset();
    listPlannedNotificationRunHistoryMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("renders an honest empty state when no families exist", async () => {
    listParentProfilesMock.mockResolvedValue([]);

    const markup = renderToStaticMarkup(
      await UsersAdminPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain("No families have registered yet");
    expect(markup).toContain("user operations list will appear here");
  });

  test("renders parent registration, user type, programme, and billing context", async () => {
    listParentProfilesMock.mockResolvedValue([
      {
        parent: {
          id: "parent-1",
          email: "parent@example.com",
          fullName: "Parent Example",
          countryCode: "US",
          deliveryTimeZone: "America/Los_Angeles",
          preferredDeliveryLocalTime: "18:30",
          onboardingReminderCount: 0,
          onboardingReminderLastAttemptAt: null,
          onboardingReminderLastSentAt: null,
          onboardingReminderLastStage: null,
          onboardingReminderLastStatus: null,
          onboardingReminderLastMessageId: null,
          onboardingReminderLastError: null,
          subscriptionStatus: "active",
          subscriptionPlan: "yearly",
          stripeCustomerId: "cus_123",
          stripeSubscriptionId: "sub_123",
          trialStartedAt: "2026-04-01T00:00:00.000Z",
          trialEndsAt: "2026-04-08T00:00:00.000Z",
          subscriptionActivatedAt: "2026-04-02T00:00:00.000Z",
          subscriptionRenewalAt: "2026-05-02T00:00:00.000Z",
          latestInvoiceId: "in_123",
          latestInvoiceNumber: "DS-2026-0001",
          latestInvoiceStatus: "paid",
          latestInvoiceHostedUrl: "https://example.com/invoice",
          latestInvoicePdfUrl: "https://example.com/invoice.pdf",
          latestInvoiceAmountPaid: 29999,
          latestInvoiceCurrency: "hkd",
          latestInvoicePaidAt: "2026-04-02T01:00:00.000Z",
          latestInvoicePeriodStart: "2026-04-02T00:00:00.000Z",
          latestInvoicePeriodEnd: "2026-05-02T00:00:00.000Z",
          notionWorkspaceId: "workspace-1",
          notionWorkspaceName: "Family Workspace",
          notionBotId: "bot-1",
          notionDatabaseId: "db-1",
          notionDatabaseName: "Daily Sparks",
          notionDataSourceId: "data-source-1",
          notionAuthorizedAt: "2026-04-02T00:00:00.000Z",
          notionLastSyncedAt: "2026-04-02T03:00:00.000Z",
          notionLastSyncStatus: "success",
          notionLastSyncMessage: "Synced.",
          notionLastSyncPageId: "page-1",
          notionLastSyncPageUrl: "https://notion.so/page-1",
          createdAt: "2026-04-01T00:00:00.000Z",
          updatedAt: "2026-04-02T03:00:00.000Z",
        },
        student: {
          id: "student-1",
          parentId: "parent-1",
          studentName: "Katherine",
          programme: "MYP",
          programmeYear: 3,
          goodnotesEmail: "katherine@goodnotes.email",
          goodnotesConnected: true,
          goodnotesVerifiedAt: "2026-04-02T00:00:00.000Z",
          goodnotesLastTestSentAt: "2026-04-02T02:00:00.000Z",
          goodnotesLastDeliveryStatus: "success",
          goodnotesLastDeliveryMessage: "Ready.",
          notionConnected: true,
          createdAt: "2026-04-01T00:00:00.000Z",
          updatedAt: "2026-04-02T03:00:00.000Z",
        },
      },
    ]);

    const markup = renderToStaticMarkup(
      await UsersAdminPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain("Parent Example");
    expect(markup).toContain("parent@example.com");
    expect(markup).toContain("Active family");
    expect(markup).toContain("MYP 3");
    expect(markup).toContain("Yearly plan");
    expect(markup).toContain("Invoice paid");
    expect(markup).toContain("Goodnotes healthy");
    expect(markup).toContain("Notion healthy");
    expect(markup).toContain("United States");
    expect(markup).toContain("6:30 PM · America/Los Angeles");
    expect(markup).toContain("/admin/editorial/users/parent-1");
  });

  test("renders expired trials as a separate business-facing user type", async () => {
    listParentProfilesMock.mockResolvedValue([
      {
        parent: {
          id: "parent-2",
          email: "expired@example.com",
          fullName: "Expired Trial Parent",
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
          trialStartedAt: "2026-03-20T00:00:00.000Z",
          trialEndsAt: "2026-03-27T00:00:00.000Z",
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
          createdAt: "2026-03-20T00:00:00.000Z",
          updatedAt: "2026-03-27T00:00:00.000Z",
        },
        student: {
          id: "student-2",
          parentId: "parent-2",
          studentName: "Mia",
          programme: "PYP",
          programmeYear: 5,
          goodnotesEmail: "",
          goodnotesConnected: false,
          goodnotesVerifiedAt: null,
          goodnotesLastTestSentAt: null,
          goodnotesLastDeliveryStatus: null,
          goodnotesLastDeliveryMessage: null,
          notionConnected: false,
          createdAt: "2026-03-20T00:00:00.000Z",
          updatedAt: "2026-03-27T00:00:00.000Z",
        },
      },
    ]);

    const markup = renderToStaticMarkup(
      await UsersAdminPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain("Trial expired family");
  });

  test("surfaces failed delivery channels as business-facing attention states", async () => {
    listParentProfilesMock.mockResolvedValue([
      {
        parent: {
          id: "parent-3",
          email: "attention@example.com",
          fullName: "Needs Attention Parent",
          countryCode: "GB",
          deliveryTimeZone: "Europe/London",
          preferredDeliveryLocalTime: "08:30",
          onboardingReminderCount: 0,
          onboardingReminderLastAttemptAt: null,
          onboardingReminderLastSentAt: null,
          onboardingReminderLastStage: null,
          onboardingReminderLastStatus: null,
          onboardingReminderLastMessageId: null,
          onboardingReminderLastError: null,
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
          notionDataSourceId: "data-source-1",
          notionAuthorizedAt: "2026-04-02T00:00:00.000Z",
          notionLastSyncedAt: "2026-04-02T03:00:00.000Z",
          notionLastSyncStatus: "failed",
          notionLastSyncMessage: "Notion API timeout.",
          notionLastSyncPageId: null,
          notionLastSyncPageUrl: null,
          createdAt: "2026-04-01T00:00:00.000Z",
          updatedAt: "2026-04-02T03:00:00.000Z",
        },
        student: {
          id: "student-3",
          parentId: "parent-3",
          studentName: "Katherine",
          programme: "MYP",
          programmeYear: 3,
          goodnotesEmail: "katherine@goodnotes.email",
          goodnotesConnected: true,
          goodnotesVerifiedAt: "2026-04-02T00:00:00.000Z",
          goodnotesLastTestSentAt: "2026-04-02T02:00:00.000Z",
          goodnotesLastDeliveryStatus: "failed",
          goodnotesLastDeliveryMessage: "SMTP relay timeout.",
          notionConnected: true,
          createdAt: "2026-04-01T00:00:00.000Z",
          updatedAt: "2026-04-02T03:00:00.000Z",
        },
      },
    ]);

    const markup = renderToStaticMarkup(
      await UsersAdminPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain("Goodnotes needs attention");
    expect(markup).toContain("Notion needs attention");
  });

  test("surfaces activation reminder status for families still stuck in setup", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-04T02:00:00.000Z"));

    listParentProfilesMock.mockResolvedValue([
      {
        parent: {
          id: "parent-4",
          email: "setup@example.com",
          fullName: "Setup Parent",
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
        },
        student: {
          id: "student-4",
          parentId: "parent-4",
          studentName: "Mia",
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
        },
      },
    ]);

    const markup = renderToStaticMarkup(
      await UsersAdminPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain("Reminder due");
    expect(markup).toContain("Needs activation reminder");
  });

  test("renders activation funnel dashboard and high-signal attention callouts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-04T02:00:00.000Z"));

    listParentProfilesMock.mockResolvedValue([
      {
        parent: {
          id: "parent-stuck",
          email: "stuck@example.com",
          fullName: "Stuck Parent",
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
          updatedAt: "2026-04-01T01:00:00.000Z",
        },
        student: {
          id: "student-stuck",
          parentId: "parent-stuck",
          studentName: "Mia",
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
          updatedAt: "2026-04-01T01:00:00.000Z",
        },
      },
      {
        parent: {
          id: "parent-paid",
          email: "paid@example.com",
          fullName: "Paid Parent",
          countryCode: "HK",
          deliveryTimeZone: "Asia/Hong_Kong",
          preferredDeliveryLocalTime: "09:00",
          firstAuthenticatedAt: "2026-04-01T00:00:00.000Z",
          childProfileCompletedAt: "2026-04-01T01:00:00.000Z",
          firstDispatchableChannelAt: "2026-04-01T02:00:00.000Z",
          firstBriefDeliveredAt: null,
          firstPaidAt: "2026-04-03T00:00:00.000Z",
          onboardingReminderCount: 0,
          onboardingReminderLastAttemptAt: null,
          onboardingReminderLastSentAt: null,
          onboardingReminderLastStage: null,
          onboardingReminderLastStatus: null,
          onboardingReminderLastMessageId: null,
          onboardingReminderLastError: null,
          subscriptionStatus: "active",
          subscriptionPlan: "monthly",
          stripeCustomerId: "cus_123",
          stripeSubscriptionId: "sub_123",
          trialStartedAt: "2026-04-01T00:00:00.000Z",
          trialEndsAt: "2026-04-08T00:00:00.000Z",
          subscriptionActivatedAt: "2026-04-03T00:00:00.000Z",
          subscriptionRenewalAt: "2026-05-03T00:00:00.000Z",
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
          updatedAt: "2026-04-03T00:00:00.000Z",
        },
        student: {
          id: "student-paid",
          parentId: "parent-paid",
          studentName: "Leo",
          programme: "PYP",
          programmeYear: 5,
          goodnotesEmail: "leo@goodnotes.email",
          goodnotesConnected: true,
          goodnotesVerifiedAt: "2026-04-01T02:00:00.000Z",
          goodnotesLastTestSentAt: null,
          goodnotesLastDeliveryStatus: null,
          goodnotesLastDeliveryMessage: null,
          notionConnected: false,
          createdAt: "2026-04-01T00:00:00.000Z",
          updatedAt: "2026-04-03T00:00:00.000Z",
        },
      },
    ]);
    listOnboardingReminderRunHistoryMock.mockResolvedValue([
      {
        id: "run-1",
        runAt: "2026-04-04T01:00:00.000Z",
        runDate: "2026-04-04",
        parentId: "parent-stuck",
        parentEmail: "stuck@example.com",
        stageIndex: 1,
        stageLabel: "First activation reminder",
        status: "failed",
        messageId: null,
        errorMessage: "SMTP offline",
        createdAt: "2026-04-04T01:00:00.000Z",
      },
    ]);

    const markup = renderToStaticMarkup(
      await UsersAdminPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain("Activation funnel");
    expect(markup).toContain("Signed in");
    expect(markup).toContain("Paid activated");
    expect(markup).toContain("Paid but first brief not delivered");
    expect(markup).toContain("Channel setup stalled");
    expect(markup).toContain("Recent reminder evidence");
  });

  test("renders a compact growth reconciliation card for daily revenue and delivery risk", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-04T02:00:00.000Z"));

    listParentProfilesMock.mockResolvedValue([
      {
        parent: {
          id: "trial-expiring",
          email: "trial-expiring@example.com",
          fullName: "Trial Expiring Parent",
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
          trialEndsAt: "2026-04-05T00:00:00.000Z",
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
          updatedAt: "2026-04-01T01:00:00.000Z",
        },
        student: {
          id: "student-trial-expiring",
          parentId: "trial-expiring",
          studentName: "Mia",
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
          updatedAt: "2026-04-01T01:00:00.000Z",
        },
      },
      {
        parent: {
          id: "active-no-channel",
          email: "active-no-channel@example.com",
          fullName: "Active No Channel",
          countryCode: "HK",
          deliveryTimeZone: "Asia/Hong_Kong",
          preferredDeliveryLocalTime: "09:00",
          firstAuthenticatedAt: "2026-04-01T00:00:00.000Z",
          childProfileCompletedAt: "2026-04-01T01:00:00.000Z",
          firstDispatchableChannelAt: null,
          firstBriefDeliveredAt: null,
          firstPaidAt: "2026-04-02T00:00:00.000Z",
          onboardingReminderCount: 0,
          onboardingReminderLastAttemptAt: null,
          onboardingReminderLastSentAt: null,
          onboardingReminderLastStage: null,
          onboardingReminderLastStatus: null,
          onboardingReminderLastMessageId: null,
          onboardingReminderLastError: null,
          subscriptionStatus: "active",
          subscriptionPlan: "monthly",
          stripeCustomerId: "cus_123",
          stripeSubscriptionId: "sub_123",
          trialStartedAt: "2026-04-01T00:00:00.000Z",
          trialEndsAt: "2026-04-08T00:00:00.000Z",
          subscriptionActivatedAt: "2026-04-02T00:00:00.000Z",
          subscriptionRenewalAt: "2026-05-02T00:00:00.000Z",
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
          updatedAt: "2026-04-02T00:00:00.000Z",
        },
        student: {
          id: "student-active-no-channel",
          parentId: "active-no-channel",
          studentName: "Leo",
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
          updatedAt: "2026-04-02T00:00:00.000Z",
        },
      },
    ]);

    const markup = renderToStaticMarkup(
      await UsersAdminPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain("Growth reconciliation");
    expect(markup).toContain("Trials expiring soon");
    expect(markup).toContain("Active without dispatchable channel");
  });

  test("renders planned notification ops visibility and per-family evidence", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-05T02:00:00.000Z"));

    listParentProfilesMock.mockResolvedValue([
      {
        parent: {
          id: "parent-notify",
          email: "notify@example.com",
          fullName: "Notify Parent",
          countryCode: "HK",
          deliveryTimeZone: "Asia/Hong_Kong",
          preferredDeliveryLocalTime: "09:00",
          onboardingReminderCount: 0,
          onboardingReminderLastAttemptAt: null,
          onboardingReminderLastSentAt: null,
          onboardingReminderLastStage: null,
          onboardingReminderLastStatus: "failed",
          onboardingReminderLastMessageId: null,
          onboardingReminderLastError: "SMTP offline",
          trialEndingReminderLastNotifiedAt: "2026-04-05T01:00:00.000Z",
          trialEndingReminderLastTrialEndsAt: "2026-04-08T00:00:00.000Z",
          billingStatusNotificationLastSentAt: null,
          billingStatusNotificationLastInvoiceId: null,
          billingStatusNotificationLastInvoiceStatus: null,
          deliverySupportAlertLastNotifiedAt: null,
          deliverySupportAlertLastReasonKey: null,
          subscriptionStatus: "trial",
          subscriptionPlan: "monthly",
          stripeCustomerId: "cus_notify",
          stripeSubscriptionId: "sub_notify",
          trialStartedAt: "2026-04-01T00:00:00.000Z",
          trialEndsAt: "2026-04-08T00:00:00.000Z",
          subscriptionActivatedAt: "2026-04-02T00:00:00.000Z",
          subscriptionRenewalAt: "2026-05-02T00:00:00.000Z",
          latestInvoiceId: "in_notify",
          latestInvoiceNumber: "DS-2026-0042",
          latestInvoiceStatus: "open",
          latestInvoiceHostedUrl: null,
          latestInvoicePdfUrl: null,
          latestInvoiceAmountPaid: 0,
          latestInvoiceCurrency: "hkd",
          latestInvoicePaidAt: null,
          latestInvoicePeriodStart: "2026-04-02T00:00:00.000Z",
          latestInvoicePeriodEnd: "2026-05-02T00:00:00.000Z",
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
          updatedAt: "2026-04-05T01:00:00.000Z",
        },
        student: {
          id: "student-notify",
          parentId: "parent-notify",
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
          updatedAt: "2026-04-05T01:00:00.000Z",
        },
      },
    ]);

    const markup = renderToStaticMarkup(
      await UsersAdminPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain("Notification operations");
    expect(markup).toContain("Trial ending active");
    expect(markup).toContain("Billing updates pending");
    expect(markup).toContain("Delivery support active");
    expect(markup).toContain("Planned notifications");
    expect(markup).toContain("Trial ending");
    expect(markup).toContain("Billing status");
    expect(markup).toContain("Delivery support");
    expect(markup).toContain("Deduped");
    expect(markup).toContain("Pending");
    expect(markup).toContain("SMTP offline");
  });

  test("renders a notification ops queue with batch actions when queue items exist", async () => {
    listParentProfilesMock.mockResolvedValue([
      {
        parent: {
          id: "parent-queue",
          email: "queue@example.com",
          fullName: "Queue Parent",
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
          trialEndingReminderLastResolvedAt: null,
          trialEndingReminderLastResolvedTrialEndsAt: null,
          billingStatusNotificationLastSentAt: null,
          billingStatusNotificationLastInvoiceId: null,
          billingStatusNotificationLastInvoiceStatus: null,
          billingStatusNotificationLastResolvedAt: null,
          billingStatusNotificationLastResolvedInvoiceId: null,
          billingStatusNotificationLastResolvedInvoiceStatus: null,
          deliverySupportAlertLastNotifiedAt: null,
          deliverySupportAlertLastReasonKey: null,
          deliverySupportAlertLastResolvedAt: null,
          deliverySupportAlertLastResolvedReasonKey: null,
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
          updatedAt: "2026-04-05T01:00:00.000Z",
        },
        student: {
          id: "student-queue",
          parentId: "parent-queue",
          studentName: "Queue Student",
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
          updatedAt: "2026-04-05T01:00:00.000Z",
        },
      },
    ]);
    listPlannedNotificationRunHistoryMock.mockResolvedValue([
      {
        id: "run-queue",
        runAt: "2026-04-05T00:30:00.000Z",
        runDate: "2026-04-05",
        parentId: "parent-queue",
        parentEmail: "queue@example.com",
        notificationFamily: "trial-ending-reminder",
        source: "growth-reconciliation",
        status: "failed",
        reason: "Trial ending soon",
        deduped: false,
        messageId: null,
        errorMessage: "SMTP offline",
        invoiceId: null,
        invoiceStatus: null,
        trialEndsAt: "2026-04-08T00:00:00.000Z",
        reasonKey: null,
        createdAt: "2026-04-05T00:30:00.000Z",
      },
    ]);

    const markup = renderToStaticMarkup(
      await UsersAdminPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain("Notification ops queue");
    expect(markup).toContain("Age / SLA");
    expect(markup).toContain("Older than 72h");
    expect(markup).toContain("Retry due");
    expect(markup).toContain("Oldest unresolved first");
    expect(markup).toContain("Send batch resend");
    expect(markup).toContain("Mark batch resolved");
    expect(markup).toContain("Queue Parent");
  });
});
