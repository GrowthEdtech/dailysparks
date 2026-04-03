export const DAILY_BRIEF_OPS_ALERT_STAGES = [
  "ingest",
  "generate",
  "preflight",
  "deliver",
  "retry-delivery",
  "run",
] as const;

export const DAILY_BRIEF_OPS_ALERT_SEVERITIES = [
  "info",
  "warning",
  "critical",
] as const;

export type DailyBriefOpsAlertStage =
  (typeof DAILY_BRIEF_OPS_ALERT_STAGES)[number];
export type DailyBriefOpsAlertSeverity =
  (typeof DAILY_BRIEF_OPS_ALERT_SEVERITIES)[number];

export type DailyBriefOpsAlert = {
  stage: DailyBriefOpsAlertStage;
  severity: DailyBriefOpsAlertSeverity;
  runDate: string;
  title: string;
  message: string;
  details?: Record<string, unknown>;
};

export type DailyBriefOpsAlertDispatchResult = {
  delivered: boolean;
  usedWebhook: boolean;
};

function getDailyBriefOpsAlertWebhookUrl() {
  return process.env.DAILY_BRIEF_OPS_ALERT_WEBHOOK_URL?.trim() ?? "";
}

export async function emitDailyBriefOpsAlert(
  alert: DailyBriefOpsAlert,
): Promise<DailyBriefOpsAlertDispatchResult> {
  const payload = {
    ...alert,
    emittedAt: new Date().toISOString(),
  };
  const webhookUrl = getDailyBriefOpsAlertWebhookUrl();
  const logger = alert.severity === "critical" ? console.error : console.warn;

  logger("[DailyBriefOpsAlert]", payload);

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
    console.error("[DailyBriefOpsAlertWebhookError]", error);

    return {
      delivered: false,
      usedWebhook: true,
    };
  }
}
