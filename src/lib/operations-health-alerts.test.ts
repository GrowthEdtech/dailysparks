import { afterEach, describe, expect, test, vi } from "vitest";

const {
  getTransactionalNotificationEmailConfigMock,
  sendTransactionalNotificationEmailMock,
} = vi.hoisted(() => ({
  getTransactionalNotificationEmailConfigMock: vi.fn(),
  sendTransactionalNotificationEmailMock: vi.fn(),
}));

vi.mock("./notification-email-delivery", () => ({
  getTransactionalNotificationEmailConfig:
    getTransactionalNotificationEmailConfigMock,
  sendTransactionalNotificationEmail: sendTransactionalNotificationEmailMock,
}));

import { emitOperationsHealthAlert } from "./operations-health-alerts";

describe("emitOperationsHealthAlert", () => {
  afterEach(() => {
    delete process.env.OPERATIONS_HEALTH_ALERT_WEBHOOK_URL;
    delete process.env.DAILY_BRIEF_OPS_ALERT_WEBHOOK_URL;
    delete process.env.OPERATIONS_HEALTH_ALERT_EMAIL_TO;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    getTransactionalNotificationEmailConfigMock.mockReset();
    sendTransactionalNotificationEmailMock.mockReset();
  });

  test("sends an admin operations email even when webhook is not configured", async () => {
    getTransactionalNotificationEmailConfigMock.mockReturnValue({
      smtpUrl: "smtp://example.test",
      fromEmail: "info@geledtech.com",
      fromName: "Growth Education Limited",
      appBaseUrl: "https://dailysparks.geledtech.com",
    });
    sendTransactionalNotificationEmailMock.mockResolvedValue({
      messageId: "ops-alert-message-id",
    });

    const result = await emitOperationsHealthAlert({
      area: "daily-brief",
      severity: "critical",
      title: "Missing production brief coverage",
      detail: "One or more production briefs were not generated today.",
      metricValue: 1,
    });

    expect(sendTransactionalNotificationEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "admin@geledtech.com",
        subject: "[Critical] Daily Sparks operations alert",
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        delivered: true,
        usedWebhook: false,
        webhookDelivered: false,
        webhookUsed: false,
        emailDelivered: true,
        emailUsed: true,
        emailRecipient: "admin@geledtech.com",
        emailMessageId: "ops-alert-message-id",
      }),
    );
  });

  test("keeps webhook and email delivery independent when one channel fails", async () => {
    process.env.OPERATIONS_HEALTH_ALERT_WEBHOOK_URL =
      "https://example.test/ops-alert";
    process.env.OPERATIONS_HEALTH_ALERT_EMAIL_TO = "ops@geledtech.com";
    getTransactionalNotificationEmailConfigMock.mockReturnValue({
      smtpUrl: "smtp://example.test",
      fromEmail: "info@geledtech.com",
      fromName: "Growth Education Limited",
      appBaseUrl: "https://dailysparks.geledtech.com",
    });
    sendTransactionalNotificationEmailMock.mockResolvedValue({
      messageId: "ops-email-message-id",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Webhook endpoint timed out.")),
    );

    const result = await emitOperationsHealthAlert({
      area: "geo-monitoring",
      severity: "warning",
      title: "GEO monitoring timed out",
      detail: "One engine check timed out after 15000ms.",
      metricValue: 1,
    });

    expect(result).toEqual(
      expect.objectContaining({
        delivered: true,
        usedWebhook: true,
        webhookDelivered: false,
        webhookUsed: true,
        emailDelivered: true,
        emailUsed: true,
        emailRecipient: "ops@geledtech.com",
      }),
    );
  });
});
