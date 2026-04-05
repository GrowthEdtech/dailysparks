import { beforeEach, describe, expect, test, vi } from "vitest";

const { sendBillingStatusUpdateNotificationMock } = vi.hoisted(() => ({
  sendBillingStatusUpdateNotificationMock: vi.fn(),
}));

const { updateParentNotificationEmailStateMock } = vi.hoisted(() => ({
  updateParentNotificationEmailStateMock: vi.fn(),
}));

const { recordPlannedNotificationRunMock, listPlannedNotificationRunHistoryMock } =
  vi.hoisted(() => ({
  recordPlannedNotificationRunMock: vi.fn(),
    listPlannedNotificationRunHistoryMock: vi.fn(),
  }));

vi.mock("./planned-notification-emails", () => ({
  sendBillingStatusUpdateNotification: sendBillingStatusUpdateNotificationMock,
}));

vi.mock("./mvp-store", () => ({
  updateParentNotificationEmailState: updateParentNotificationEmailStateMock,
}));

vi.mock("./planned-notification-history-store", () => ({
  recordPlannedNotificationRun: recordPlannedNotificationRunMock,
  listPlannedNotificationRunHistory: listPlannedNotificationRunHistoryMock,
}));

import type { ParentProfile } from "./mvp-types";
import { maybeSendBillingStatusNotification } from "./billing-status-notification";

function buildProfile(
  overrides: {
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
      subscriptionStatus: "active",
      subscriptionPlan: "monthly",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      trialStartedAt: "2026-04-01T00:00:00.000Z",
      trialEndsAt: "2026-04-08T00:00:00.000Z",
      subscriptionActivatedAt: "2026-04-02T00:00:00.000Z",
      subscriptionRenewalAt: "2026-05-05T00:00:00.000Z",
      latestInvoiceId: "in_123",
      latestInvoiceNumber: "INV-123",
      latestInvoiceStatus: "paid",
      latestInvoiceHostedUrl: "https://invoice.example.com",
      latestInvoicePdfUrl: "https://invoice.example.com/pdf",
      latestInvoiceAmountPaid: 1800,
      latestInvoiceCurrency: "usd",
      latestInvoicePaidAt: "2026-04-05T01:00:00.000Z",
      latestInvoicePeriodStart: "2026-04-05T00:00:00.000Z",
      latestInvoicePeriodEnd: "2026-05-05T00:00:00.000Z",
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
      billingStatusNotificationLastSentAt: null,
      billingStatusNotificationLastInvoiceId: null,
      billingStatusNotificationLastInvoiceStatus: null,
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

describe("billing status notification", () => {
  beforeEach(() => {
    sendBillingStatusUpdateNotificationMock.mockReset();
    updateParentNotificationEmailStateMock.mockReset();
    recordPlannedNotificationRunMock.mockReset();
    listPlannedNotificationRunHistoryMock.mockReset();
    listPlannedNotificationRunHistoryMock.mockResolvedValue([]);
  });

  test("sends a billing status email once per invoice id and status", async () => {
    updateParentNotificationEmailStateMock.mockResolvedValue(null);
    recordPlannedNotificationRunMock.mockResolvedValue(null);
    sendBillingStatusUpdateNotificationMock.mockResolvedValue({
      sent: true,
      skipped: false,
      reason: null,
      messageId: "billing-message-1",
    });

    const result = await maybeSendBillingStatusNotification({
      profile: buildProfile(),
      invoiceId: "in_123",
      invoiceStatus: "paid",
      now: new Date("2026-04-05T02:00:00.000Z"),
    });

    expect(sendBillingStatusUpdateNotificationMock).toHaveBeenCalledTimes(1);
    expect(updateParentNotificationEmailStateMock).toHaveBeenCalledTimes(1);
    expect(recordPlannedNotificationRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationFamily: "billing-status-update",
        source: "stripe-webhook",
        status: "sent",
        invoiceId: "in_123",
        invoiceStatus: "paid",
      }),
    );
    expect(result.sent).toBe(true);
  });

  test("skips duplicate invoice notifications that were already sent", async () => {
    recordPlannedNotificationRunMock.mockResolvedValue(null);

    const result = await maybeSendBillingStatusNotification({
      profile: buildProfile({
        parent: {
          billingStatusNotificationLastInvoiceId: "in_123",
          billingStatusNotificationLastInvoiceStatus: "paid",
        },
      }),
      invoiceId: "in_123",
      invoiceStatus: "paid",
      now: new Date("2026-04-05T02:00:00.000Z"),
    });

    expect(sendBillingStatusUpdateNotificationMock).not.toHaveBeenCalled();
    expect(updateParentNotificationEmailStateMock).not.toHaveBeenCalled();
    expect(recordPlannedNotificationRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationFamily: "billing-status-update",
        source: "stripe-webhook",
        status: "skipped",
        deduped: true,
      }),
    );
    expect(result.skipped).toBe(true);
  });

  test("escalates after repeated billing notification failures for the same invoice", async () => {
    recordPlannedNotificationRunMock.mockResolvedValue(null);
    listPlannedNotificationRunHistoryMock.mockResolvedValue([
      {
        id: "run-1",
        runAt: "2026-04-05T00:30:00.000Z",
        runDate: "2026-04-05",
        parentId: "parent-1",
        parentEmail: "parent@example.com",
        notificationFamily: "billing-status-update",
        source: "stripe-webhook",
        status: "failed",
        reason: "Invoice open notification pending",
        deduped: false,
        messageId: null,
        errorMessage: "SMTP offline",
        invoiceId: "in_123",
        invoiceStatus: "paid",
        trialEndsAt: null,
        reasonKey: null,
        createdAt: "2026-04-05T00:30:00.000Z",
      },
      {
        id: "run-2",
        runAt: "2026-04-05T01:15:00.000Z",
        runDate: "2026-04-05",
        parentId: "parent-1",
        parentEmail: "parent@example.com",
        notificationFamily: "billing-status-update",
        source: "stripe-webhook",
        status: "failed",
        reason: "Invoice open notification pending",
        deduped: false,
        messageId: null,
        errorMessage: "SMTP offline",
        invoiceId: "in_123",
        invoiceStatus: "paid",
        trialEndsAt: null,
        reasonKey: null,
        createdAt: "2026-04-05T01:15:00.000Z",
      },
    ]);

    const result = await maybeSendBillingStatusNotification({
      profile: buildProfile(),
      invoiceId: "in_123",
      invoiceStatus: "paid",
      now: new Date("2026-04-05T02:00:00.000Z"),
    });

    expect(sendBillingStatusUpdateNotificationMock).not.toHaveBeenCalled();
    expect(result.skipped).toBe(true);
    expect(result.reason).toMatch(/manual intervention/i);
    expect(recordPlannedNotificationRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationFamily: "billing-status-update",
        status: "escalated",
      }),
    );
  });
});
