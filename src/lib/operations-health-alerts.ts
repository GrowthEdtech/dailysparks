import type { OperationsHealthAlert } from "./operations-health-run-schema";

export type OperationsHealthAlertDispatchResult = {
  delivered: boolean;
  usedWebhook: boolean;
};

function getOperationsHealthAlertWebhookUrl() {
  return (
    process.env.OPERATIONS_HEALTH_ALERT_WEBHOOK_URL?.trim() ||
    process.env.DAILY_BRIEF_OPS_ALERT_WEBHOOK_URL?.trim() ||
    ""
  );
}

export async function emitOperationsHealthAlert(
  alert: OperationsHealthAlert,
): Promise<OperationsHealthAlertDispatchResult> {
  const payload = {
    ...alert,
    emittedAt: new Date().toISOString(),
  };
  const webhookUrl = getOperationsHealthAlertWebhookUrl();
  const logger = alert.severity === "critical" ? console.error : console.warn;

  logger("[OperationsHealthAlert]", payload);

  if (!webhookUrl) {
    return {
      delivered: false,
      usedWebhook: false,
    };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return {
      delivered: response.ok,
      usedWebhook: true,
    };
  } catch (error) {
    console.error("[OperationsHealthAlertWebhookError]", error);

    return {
      delivered: false,
      usedWebhook: true,
    };
  }
}
