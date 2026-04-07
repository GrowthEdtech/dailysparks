import type { OperationsHealthSnapshot } from "../../../../lib/operations-health";
import type { OperationsHealthRunRecord } from "../../../../lib/operations-health-run-schema";

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not recorded yet";
  }

  return new Intl.DateTimeFormat("en-HK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function buildRecommendedHandoffNote(snapshot: OperationsHealthSnapshot) {
  if (
    snapshot.status === "critical" ||
    snapshot.dailyBrief.blockedCanaryCount > 0
  ) {
    return "Blocked canary is active or a critical alert is present. Hold release decisions until canary evidence, alert detail, and remediation state have all been reviewed by ops.";
  }

  if (
    snapshot.status === "warning" ||
    snapshot.dailyBrief.retryCandidateCount > 0 ||
    snapshot.notifications.escalatedCount > 0
  ) {
    return "Warnings are active. Watch retry and escalation counts for shrinkage, and confirm the latest remediation pass is still moving the system back to healthy.";
  }

  return "System is currently healthy. Continue routine checks at shift change and confirm the next scheduled canary, GEO run, and reconciliation window remain on time.";
}

export function buildOperationsHealthHandoffSummary(input: {
  snapshot: OperationsHealthSnapshot;
  latestRun: OperationsHealthRunRecord | null;
}) {
  const { snapshot, latestRun } = input;
  const recentAlerts = (latestRun?.alerts ?? []).slice(0, 3);
  const recentActions = (latestRun?.remediationActions ?? []).slice(0, 3);

  const alertLines =
    recentAlerts.length > 0
      ? recentAlerts.map(
          (alert) =>
            `- ${alert.severity.toUpperCase()} ${alert.area}: ${alert.title}`,
        )
      : ["- None in the latest immutable run"];

  const actionLines =
    recentActions.length > 0
      ? recentActions.map(
          (action) => `- ${action.action} (${action.status}): ${action.detail}`,
        )
      : ["- No remediation actions recorded yet"];

  return [
    "# Operations Health Shift Handoff",
    "",
    "## Snapshot",
    `- Run date: ${snapshot.runDate}`,
    `- Latest immutable run: ${formatTimestamp(latestRun?.completedAt ?? null)}`,
    `- Status: ${snapshot.status}`,
    `- Daily Brief: ${snapshot.dailyBrief.generatedCount}/${snapshot.dailyBrief.expectedProductionCount} generated, ${snapshot.dailyBrief.retryCandidateCount} retry candidate${snapshot.dailyBrief.retryCandidateCount === 1 ? "" : "s"}, ${snapshot.dailyBrief.blockedCanaryCount} blocked by canary`,
    `- Alerts: ${snapshot.alerts.length} active`,
    `- Notifications: ${snapshot.notifications.escalatedCount} escalated, ${snapshot.notifications.over72hCount} older than 72h`,
    `- Billing: ${snapshot.billing.actionableCount} actionable item${snapshot.billing.actionableCount === 1 ? "" : "s"}`,
    `- GEO: ${snapshot.geo.latestRunStatus ?? "not recorded"}, ${snapshot.geo.activePromptCount} active prompts, ${snapshot.geo.timeoutCount} timeout${snapshot.geo.timeoutCount === 1 ? "" : "s"}`,
    "",
    "## Top alerts",
    ...alertLines,
    "",
    "## Recent remediation",
    ...actionLines,
    "",
    "## Recommended handoff note",
    buildRecommendedHandoffNote(snapshot),
  ].join("\n");
}
