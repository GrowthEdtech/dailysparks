import type { OperationsHealthAlert } from "./operations-health-run-schema";
import { buildNotificationEmail } from "./notification-email-design-system";
import {
  getTransactionalNotificationEmailConfig,
  sendTransactionalNotificationEmail,
} from "./notification-email-delivery";

export type OperationsHealthAlertDispatchResult = {
  delivered: boolean;
  usedWebhook: boolean;
  webhookDelivered?: boolean;
  webhookUsed?: boolean;
  emailDelivered?: boolean;
  emailUsed?: boolean;
  emailRecipient?: string | null;
  emailMessageId?: string | null;
};

function getOperationsHealthAlertWebhookUrl() {
  return (
    process.env.OPERATIONS_HEALTH_ALERT_WEBHOOK_URL?.trim() ||
    process.env.DAILY_BRIEF_OPS_ALERT_WEBHOOK_URL?.trim() ||
    ""
  );
}

function getOperationsHealthAlertEmailRecipient() {
  return (
    process.env.OPERATIONS_HEALTH_ALERT_EMAIL_TO?.trim() ||
    "admin@geledtech.com"
  );
}

function buildOperationsHealthAlertEmail(alert: OperationsHealthAlert) {
  const config = getTransactionalNotificationEmailConfig();
  const appBaseUrl =
    config?.appBaseUrl || "https://dailysparks.geledtech.com";
  const severityLabel = alert.severity === "critical" ? "Critical" : "Warning";
  const email = buildNotificationEmail({
    previewText: `${severityLabel} operations alert: ${alert.title}`,
    eyebrow: "Operations health alert",
    title: `${severityLabel}: ${alert.title}`,
    intro:
      "Daily Sparks detected an operational condition that needs review. This alert was emitted from the operations-health reliability layer.",
    panels: [
      {
        eyebrow: "Area",
        title: alert.area,
        body: alert.detail,
        tone: alert.severity === "critical" ? "accent" : "primary",
      },
    ],
    bulletSections: [
      {
        title: "Alert details",
        items: [
          `Severity: ${severityLabel}`,
          alert.metricValue === null
            ? "Metric value: not recorded"
            : `Metric value: ${alert.metricValue}`,
          "Source: operations-health automated alert",
        ],
      },
    ],
    primaryAction: {
      label: "Open operations health dashboard",
      href: `${appBaseUrl}/admin/editorial/operations-health`,
    },
    supportingNote:
      "Use the operations dashboard to inspect recent remediation attempts, current SLA pressure, and immutable run evidence.",
    signature: "Growth Education Limited",
    footerNote: "Operations health alert · HTML notification",
  });

  return {
    subject: `[${severityLabel}] Daily Sparks operations alert`,
    html: email.html,
    text: email.text,
  };
}

export async function emitOperationsHealthAlert(
  alert: OperationsHealthAlert,
): Promise<OperationsHealthAlertDispatchResult> {
  const payload = {
    ...alert,
    emittedAt: new Date().toISOString(),
  };
  const webhookUrl = getOperationsHealthAlertWebhookUrl();
  const emailRecipient = getOperationsHealthAlertEmailRecipient();
  const emailConfigured = getTransactionalNotificationEmailConfig() !== null;
  const logger = alert.severity === "critical" ? console.error : console.warn;

  logger("[OperationsHealthAlert]", payload);

  let webhookDelivered = false;
  let emailDelivered = false;
  let emailMessageId: string | null = null;

  if (webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      webhookDelivered = response.ok;
    } catch (error) {
      console.error("[OperationsHealthAlertWebhookError]", error);
    }
  }

  if (emailConfigured && emailRecipient) {
    try {
      const email = buildOperationsHealthAlertEmail(alert);
      const result = await sendTransactionalNotificationEmail({
        to: emailRecipient,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      emailDelivered = Boolean(result.messageId);
      emailMessageId = result.messageId;
    } catch (error) {
      console.error("[OperationsHealthAlertEmailError]", error);
    }
  }

  return {
    delivered: webhookDelivered || emailDelivered,
    usedWebhook: Boolean(webhookUrl),
    webhookDelivered,
    webhookUsed: Boolean(webhookUrl),
    emailDelivered,
    emailUsed: emailConfigured,
    emailRecipient: emailConfigured ? emailRecipient : null,
    emailMessageId,
  };
}
