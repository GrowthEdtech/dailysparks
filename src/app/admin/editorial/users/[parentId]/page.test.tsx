import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { getProfileByParentIdMock, notFoundMock } = vi.hoisted(() => ({
  getProfileByParentIdMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const { listOnboardingReminderRunHistoryMock } = vi.hoisted(() => ({
  listOnboardingReminderRunHistoryMock: vi.fn(),
}));

const { listPlannedNotificationRunHistoryMock } = vi.hoisted(() => ({
  listPlannedNotificationRunHistoryMock: vi.fn(),
}));

vi.mock("../../../../../lib/mvp-store", () => ({
  getProfileByParentId: getProfileByParentIdMock,
}));

vi.mock("../../../../../lib/onboarding-reminder-history-store", () => ({
  listOnboardingReminderRunHistory: listOnboardingReminderRunHistoryMock,
}));

vi.mock("../../../../../lib/planned-notification-history-store", () => ({
  listPlannedNotificationRunHistory: listPlannedNotificationRunHistoryMock,
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import UserDetailAdminPage from "./page";

describe("UserDetailAdminPage", () => {
  beforeEach(() => {
    getProfileByParentIdMock.mockReset();
    notFoundMock.mockClear();
    listOnboardingReminderRunHistoryMock.mockReset();
    listOnboardingReminderRunHistoryMock.mockResolvedValue([]);
    listPlannedNotificationRunHistoryMock.mockReset();
    listPlannedNotificationRunHistoryMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("renders overview, billing, and delivery sections", async () => {
    getProfileByParentIdMock.mockResolvedValue({
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
        subscriptionStatus: "trial",
        subscriptionPlan: "monthly",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        trialStartedAt: "2026-04-01T00:00:00.000Z",
        trialEndsAt: "2026-04-08T00:00:00.000Z",
        subscriptionActivatedAt: null,
        subscriptionRenewalAt: null,
        latestInvoiceId: "in_123",
        latestInvoiceNumber: "DS-2026-0001",
        latestInvoiceStatus: "open",
        latestInvoiceHostedUrl: "https://example.com/invoice",
        latestInvoicePdfUrl: "https://example.com/invoice.pdf",
        latestInvoiceAmountPaid: 0,
        latestInvoiceCurrency: "hkd",
        latestInvoicePaidAt: null,
        latestInvoicePeriodStart: "2026-04-01T00:00:00.000Z",
        latestInvoicePeriodEnd: "2026-05-01T00:00:00.000Z",
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
        programme: "DP",
        programmeYear: 1,
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
    });

    const markup = renderToStaticMarkup(
      await UserDetailAdminPage({
        params: Promise.resolve({ parentId: "parent-1" }),
      }),
    );

    expect(markup).toContain("Back to Users");
    expect(markup).toContain("Family overview");
    expect(markup).toContain("Student profile");
    expect(markup).toContain("Billing snapshot");
    expect(markup).toContain("Delivery channels");
    expect(markup).toContain("Parent Example");
    expect(markup).toContain("Trial family");
    expect(markup).toContain("DP 1");
    expect(markup).toContain("Monthly plan");
    expect(markup).toContain("Goodnotes healthy");
    expect(markup).toContain("Notion healthy");
    expect(markup).toContain("Goodnotes status");
    expect(markup).toContain("Ready.");
    expect(markup).toContain("Notion status");
    expect(markup).toContain("Synced.");
    expect(markup).toContain("Country / region");
    expect(markup).toContain("United States");
    expect(markup).toContain("Time zone");
    expect(markup).toContain("America/Los Angeles");
    expect(markup).toContain("6:30 PM · America/Los Angeles");
  });

  test("renders expired trial families with the derived user type", async () => {
    getProfileByParentIdMock.mockResolvedValue({
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
    });

    const markup = renderToStaticMarkup(
      await UserDetailAdminPage({
        params: Promise.resolve({ parentId: "parent-2" }),
      }),
    );

    expect(markup).toContain("Trial expired family");
  });

  test("calls notFound when the parent profile does not exist", async () => {
    getProfileByParentIdMock.mockResolvedValue(null);

    await expect(
      UserDetailAdminPage({
        params: Promise.resolve({ parentId: "missing-parent" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  test("renders activation reminder tracking for setup families", async () => {
    getProfileByParentIdMock.mockResolvedValue({
      parent: {
        id: "parent-3",
        email: "setup@example.com",
        fullName: "Setup Parent",
        countryCode: "HK",
        deliveryTimeZone: "Asia/Hong_Kong",
        preferredDeliveryLocalTime: "09:00",
        onboardingReminderCount: 1,
        onboardingReminderLastAttemptAt: "2026-04-03T01:00:00.000Z",
        onboardingReminderLastSentAt: "2026-04-03T01:00:05.000Z",
        onboardingReminderLastStage: 1,
        onboardingReminderLastStatus: "sent",
        onboardingReminderLastMessageId: "message-1",
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
        updatedAt: "2026-04-03T01:00:05.000Z",
      },
      student: {
        id: "student-3",
        parentId: "parent-3",
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
        updatedAt: "2026-04-03T01:00:05.000Z",
      },
    });

    const markup = renderToStaticMarkup(
      await UserDetailAdminPage({
        params: Promise.resolve({ parentId: "parent-3" }),
      }),
    );

    expect(markup).toContain("Activation reminders");
    expect(markup).toContain("1 reminder sent");
    expect(markup).toContain("Last reminder sent");
    expect(markup).toContain("message-1");
  });

  test("renders activation funnel milestones, attention callouts, and recent reminder evidence", async () => {
    getProfileByParentIdMock.mockResolvedValue({
      parent: {
        id: "parent-4",
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
        onboardingReminderCount: 1,
        onboardingReminderLastAttemptAt: "2026-04-03T01:00:00.000Z",
        onboardingReminderLastSentAt: null,
        onboardingReminderLastStage: 1,
        onboardingReminderLastStatus: "failed",
        onboardingReminderLastMessageId: null,
        onboardingReminderLastError: "SMTP offline",
        subscriptionStatus: "active",
        subscriptionPlan: "monthly",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        trialStartedAt: "2026-04-01T00:00:00.000Z",
        trialEndsAt: "2026-04-08T00:00:00.000Z",
        subscriptionActivatedAt: "2026-04-03T00:00:00.000Z",
        subscriptionRenewalAt: "2026-05-03T00:00:00.000Z",
        latestInvoiceId: "in_123",
        latestInvoiceNumber: "DS-2026-0001",
        latestInvoiceStatus: "paid",
        latestInvoiceHostedUrl: "https://example.com/invoice",
        latestInvoicePdfUrl: "https://example.com/invoice.pdf",
        latestInvoiceAmountPaid: 29999,
        latestInvoiceCurrency: "hkd",
        latestInvoicePaidAt: "2026-04-03T00:00:00.000Z",
        latestInvoicePeriodStart: "2026-04-03T00:00:00.000Z",
        latestInvoicePeriodEnd: "2026-05-03T00:00:00.000Z",
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
        updatedAt: "2026-04-03T01:00:00.000Z",
      },
      student: {
        id: "student-4",
        parentId: "parent-4",
        studentName: "Mia",
        programme: "PYP",
        programmeYear: 5,
        goodnotesEmail: "mia@goodnotes.email",
        goodnotesConnected: true,
        goodnotesVerifiedAt: "2026-04-01T02:00:00.000Z",
        goodnotesLastTestSentAt: "2026-04-01T02:30:00.000Z",
        goodnotesLastDeliveryStatus: null,
        goodnotesLastDeliveryMessage: null,
        notionConnected: false,
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-03T01:00:00.000Z",
      },
    });
    listOnboardingReminderRunHistoryMock.mockResolvedValue([
      {
        id: "run-1",
        runAt: "2026-04-03T01:00:00.000Z",
        runDate: "2026-04-03",
        parentId: "parent-4",
        parentEmail: "paid@example.com",
        stageIndex: 1,
        stageLabel: "First activation reminder",
        status: "failed",
        messageId: null,
        errorMessage: "SMTP offline",
        createdAt: "2026-04-03T01:00:00.000Z",
      },
      {
        id: "run-2",
        runAt: "2026-04-03T03:00:00.000Z",
        runDate: "2026-04-03",
        parentId: "parent-4",
        parentEmail: "paid@example.com",
        stageIndex: 1,
        stageLabel: "First activation reminder",
        status: "sent",
        messageId: "message-2",
        errorMessage: null,
        createdAt: "2026-04-03T03:00:00.000Z",
      },
    ]);

    const markup = renderToStaticMarkup(
      await UserDetailAdminPage({
        params: Promise.resolve({ parentId: "parent-4" }),
      }),
    );

    expect(markup).toContain("Activation funnel");
    expect(markup).toContain("Current stage");
    expect(markup).toContain("Paid but first brief not delivered");
    expect(markup).toContain("Recent reminder runs");
    expect(markup).toContain("First activation reminder");
    expect(markup).toContain("message-2");
    expect(markup).toContain("SMTP offline");
  });

  test("renders planned notification evidence with reasons and dedupe state", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-05T02:00:00.000Z"));

    getProfileByParentIdMock.mockResolvedValue({
      parent: {
        id: "parent-5",
        email: "ops@example.com",
        fullName: "Ops Parent",
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
        subscriptionPlan: "monthly",
        stripeCustomerId: "cus_ops",
        stripeSubscriptionId: "sub_ops",
        trialStartedAt: "2026-04-01T00:00:00.000Z",
        trialEndsAt: "2026-04-08T00:00:00.000Z",
        subscriptionActivatedAt: "2026-04-02T00:00:00.000Z",
        subscriptionRenewalAt: "2026-05-02T00:00:00.000Z",
        latestInvoiceId: "in_ops",
        latestInvoiceNumber: "DS-2026-0043",
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
        id: "student-5",
        parentId: "parent-5",
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
        updatedAt: "2026-04-05T01:00:00.000Z",
      },
    });
    listPlannedNotificationRunHistoryMock.mockResolvedValue([
      {
        id: "planned-run-1",
        runAt: "2026-04-05T01:00:00.000Z",
        runDate: "2026-04-05",
        parentId: "parent-5",
        parentEmail: "ops@example.com",
        notificationFamily: "trial-ending-reminder",
        source: "growth-reconciliation",
        status: "sent",
        reason: "Trial ending reminder is due within 48 hours.",
        deduped: false,
        messageId: "trial-message-1",
        errorMessage: null,
        invoiceId: null,
        invoiceStatus: null,
        trialEndsAt: "2026-04-08T00:00:00.000Z",
        reasonKey: null,
        createdAt: "2026-04-05T01:00:00.000Z",
      },
      {
        id: "planned-run-2",
        runAt: "2026-04-05T01:30:00.000Z",
        runDate: "2026-04-05",
        parentId: "parent-5",
        parentEmail: "ops@example.com",
        notificationFamily: "billing-status-update",
        source: "manual-resolve",
        status: "resolved",
        reason: "Ops confirmed the invoice follow-up outside of email.",
        deduped: false,
        messageId: null,
        errorMessage: null,
        invoiceId: "in_ops",
        invoiceStatus: "open",
        trialEndsAt: null,
        reasonKey: null,
        createdAt: "2026-04-05T01:30:00.000Z",
      },
    ]);

    const markup = renderToStaticMarkup(
      await UserDetailAdminPage({
        params: Promise.resolve({ parentId: "parent-5" }),
      }),
    );

    expect(markup).toContain("Notification evidence");
    expect(markup).toContain("Trial ending");
    expect(markup).toContain("Billing status");
    expect(markup).toContain("Delivery support");
    expect(markup).toContain("Current notification state");
    expect(markup).toContain("Last sent");
    expect(markup).toContain("Deduped");
    expect(markup).toContain("Pending");
    expect(markup).toContain("already covers this trial window");
    expect(markup).toContain("invoice open");
    expect(markup).toContain("SMTP offline");
    expect(markup).toContain("Recent notification runs");
    expect(markup).toContain("Trial ending reminder");
    expect(markup).toContain("Ops confirmed the invoice follow-up outside of email.");
    expect(markup).toContain("Manual resend / resolve");
    expect(markup).toContain("Send manual resend");
    expect(markup).toContain("Mark current state resolved");
  });
});
