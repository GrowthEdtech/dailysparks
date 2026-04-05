import { beforeEach, describe, expect, test, vi } from "vitest";

const { sendTrialEndingReminderNotificationMock, sendDeliverySupportAlertNotificationMock } =
  vi.hoisted(() => ({
    sendTrialEndingReminderNotificationMock: vi.fn(),
    sendDeliverySupportAlertNotificationMock: vi.fn(),
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
  sendTrialEndingReminderNotification: sendTrialEndingReminderNotificationMock,
  sendDeliverySupportAlertNotification: sendDeliverySupportAlertNotificationMock,
}));

vi.mock("./mvp-store", () => ({
  updateParentNotificationEmailState: updateParentNotificationEmailStateMock,
}));

vi.mock("./planned-notification-history-store", () => ({
  recordPlannedNotificationRun: recordPlannedNotificationRunMock,
  listPlannedNotificationRunHistory: listPlannedNotificationRunHistoryMock,
}));

import type { ParentProfile } from "./mvp-types";
import { runGrowthNotificationEmails } from "./growth-notification-runner";

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
      firstAuthenticatedAt: "2026-04-01T00:00:00.000Z",
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

describe("growth notification runner", () => {
  beforeEach(() => {
    sendTrialEndingReminderNotificationMock.mockReset();
    sendDeliverySupportAlertNotificationMock.mockReset();
    updateParentNotificationEmailStateMock.mockReset();
    recordPlannedNotificationRunMock.mockReset();
    listPlannedNotificationRunHistoryMock.mockReset();
    listPlannedNotificationRunHistoryMock.mockResolvedValue([]);
  });

  test("sends trial-ending and delivery-support notifications only when due", async () => {
    updateParentNotificationEmailStateMock.mockResolvedValue(null);
    recordPlannedNotificationRunMock.mockResolvedValue(null);
    listPlannedNotificationRunHistoryMock.mockResolvedValue([]);
    sendTrialEndingReminderNotificationMock.mockResolvedValue({
      sent: true,
      skipped: false,
      reason: null,
      messageId: "trial-message-1",
    });
    sendDeliverySupportAlertNotificationMock.mockResolvedValue({
      sent: true,
      skipped: false,
      reason: null,
      messageId: "support-message-1",
    });

    const result = await runGrowthNotificationEmails({
      profiles: [
        buildProfile(),
        buildProfile({
          parent: {
            id: "active-no-channel",
            email: "active-no-channel@example.com",
            subscriptionStatus: "active",
            subscriptionActivatedAt: "2026-04-02T00:00:00.000Z",
            latestInvoiceStatus: "paid",
            latestInvoicePaidAt: "2026-04-02T00:00:00.000Z",
          },
        }),
      ],
      now: new Date("2026-04-04T02:00:00.000Z"),
    });

    expect(sendTrialEndingReminderNotificationMock).toHaveBeenCalledTimes(1);
    expect(sendDeliverySupportAlertNotificationMock).toHaveBeenCalledTimes(1);
    expect(updateParentNotificationEmailStateMock).toHaveBeenCalledTimes(2);
    expect(recordPlannedNotificationRunMock).toHaveBeenCalledTimes(2);
    expect(recordPlannedNotificationRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationFamily: "trial-ending-reminder",
        source: "growth-reconciliation",
        status: "sent",
      }),
    );
    expect(recordPlannedNotificationRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationFamily: "delivery-support-alert",
        source: "growth-reconciliation",
        status: "sent",
      }),
    );
    expect(result.trialEnding.sentCount).toBe(1);
    expect(result.deliverySupport.sentCount).toBe(1);
  });

  test("defers automatic trial-ending retries while cooldown is active", async () => {
    updateParentNotificationEmailStateMock.mockResolvedValue(null);
    recordPlannedNotificationRunMock.mockResolvedValue(null);
    listPlannedNotificationRunHistoryMock.mockResolvedValue([
      {
        id: "run-1",
        runAt: "2026-04-04T01:45:00.000Z",
        runDate: "2026-04-04",
        parentId: "parent-1",
        parentEmail: "parent@example.com",
        notificationFamily: "trial-ending-reminder",
        source: "growth-reconciliation",
        status: "failed",
        reason: "Trial ending soon",
        deduped: false,
        messageId: null,
        errorMessage: "SMTP offline",
        invoiceId: null,
        invoiceStatus: null,
        trialEndsAt: "2026-04-05T00:00:00.000Z",
        reasonKey: null,
        createdAt: "2026-04-04T01:45:00.000Z",
      },
    ]);

    const result = await runGrowthNotificationEmails({
      profiles: [buildProfile()],
      now: new Date("2026-04-04T02:00:00.000Z"),
    });

    expect(sendTrialEndingReminderNotificationMock).not.toHaveBeenCalled();
    expect(result.trialEnding.skippedCount).toBe(1);
    expect(recordPlannedNotificationRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationFamily: "trial-ending-reminder",
        status: "deferred",
      }),
    );
  });
});
