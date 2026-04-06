import { DAILY_BRIEF_EDITORIAL_COHORTS } from "./daily-brief-cohorts";
import type { DailyBriefHistoryRecord } from "./daily-brief-history-schema";
import type { GeoMonitoringRunRecord } from "./geo-monitoring-run-schema";
import type { PlannedNotificationRunRecord } from "./planned-notification-history-schema";
import type { PlannedNotificationOpsQueue } from "./planned-notification-ops";
import type {
  OperationsHealthAlert,
  OperationsHealthBillingSummary,
  OperationsHealthDailyBriefSummary,
  OperationsHealthGeoSummary,
  OperationsHealthNotificationsSummary,
  OperationsHealthRunStatus,
} from "./operations-health-run-schema";

export type OperationsHealthSnapshot = {
  runDate: string;
  status: OperationsHealthRunStatus;
  dailyBrief: OperationsHealthDailyBriefSummary;
  notifications: OperationsHealthNotificationsSummary;
  geo: OperationsHealthGeoSummary;
  billing: OperationsHealthBillingSummary;
  alerts: OperationsHealthAlert[];
};

const EXPECTED_PROGRAMMES_PER_DAY = 3;

function countGeoTimeouts(notes: string) {
  const matches = notes.match(/timed out after/gi);
  return matches?.length ?? 0;
}

function getStatusFromAlerts(alerts: OperationsHealthAlert[]): OperationsHealthRunStatus {
  if (alerts.some((alert) => alert.severity === "critical")) {
    return "critical";
  }

  if (alerts.length > 0) {
    return "warning";
  }

  return "healthy";
}

export function buildOperationsHealthSnapshot(input: {
  runDate: string;
  now?: Date;
  dailyBriefHistory: DailyBriefHistoryRecord[];
  plannedNotificationQueue: PlannedNotificationOpsQueue;
  plannedNotificationHistory: PlannedNotificationRunRecord[];
  geoRuns: GeoMonitoringRunRecord[];
}): OperationsHealthSnapshot {
  const now = input.now ?? new Date();
  const alerts: OperationsHealthAlert[] = [];
  const dailyBriefHistory = input.dailyBriefHistory.filter(
    (entry) =>
      entry.recordKind === "production" &&
      entry.routingKeyIncomplete !== true &&
      entry.scheduledFor === input.runDate,
  );
  const expectedProductionCount =
    DAILY_BRIEF_EDITORIAL_COHORTS.length * EXPECTED_PROGRAMMES_PER_DAY;
  const generatedCount = dailyBriefHistory.length;
  const approvedCount = dailyBriefHistory.filter(
    (entry) => entry.status === "approved" || entry.status === "published",
  ).length;
  const publishedCount = dailyBriefHistory.filter(
    (entry) => entry.status === "published",
  ).length;
  const failedCount = dailyBriefHistory.filter(
    (entry) => entry.status === "failed",
  ).length;
  const retryCandidateCount = dailyBriefHistory.filter((entry) => {
    if (entry.failedDeliveryTargets.length === 0 || !entry.retryEligibleUntil) {
      return false;
    }

    return entry.retryEligibleUntil >= now.toISOString();
  }).length;
  const missingProductionCount = Math.max(
    0,
    expectedProductionCount - generatedCount,
  );

  const dailyBrief: OperationsHealthDailyBriefSummary = {
    expectedProductionCount,
    generatedCount,
    approvedCount,
    publishedCount,
    failedCount,
    missingProductionCount,
    retryCandidateCount,
  };

  if (missingProductionCount > 0) {
    alerts.push({
      area: "daily-brief",
      severity: "critical",
      title: "Missing expected production briefs",
      detail: `${missingProductionCount} expected production brief record(s) are still missing for ${input.runDate}.`,
      metricValue: missingProductionCount,
    });
  }

  if (retryCandidateCount > 0) {
    alerts.push({
      area: "daily-brief",
      severity: "warning",
      title: "Retry-eligible brief deliveries need recovery",
      detail: `${retryCandidateCount} production brief(s) still have retry-eligible failed delivery targets.`,
      metricValue: retryCandidateCount,
    });
  }

  const notifications: OperationsHealthNotificationsSummary = {
    queueCount: input.plannedNotificationQueue.summary.totalCount,
    pendingCount: input.plannedNotificationQueue.summary.pendingCount,
    retryDueCount: input.plannedNotificationQueue.summary.retryDueCount,
    coolingDownCount: input.plannedNotificationQueue.summary.coolingDownCount,
    escalatedCount: input.plannedNotificationQueue.summary.escalatedCount,
    dedupedCount: input.plannedNotificationQueue.summary.dedupedCount,
    under24hCount: input.plannedNotificationQueue.summary.under24hCount,
    between24hAnd72hCount:
      input.plannedNotificationQueue.summary.between24hAnd72hCount,
    over72hCount: input.plannedNotificationQueue.summary.over72hCount,
  };

  if (notifications.escalatedCount > 0) {
    alerts.push({
      area: "planned-notifications",
      severity: "critical",
      title: "Notifications require manual intervention",
      detail: `${notifications.escalatedCount} notification queue item(s) are escalated and now require manual follow-up.`,
      metricValue: notifications.escalatedCount,
    });
  }

  if (notifications.over72hCount > 0) {
    alerts.push({
      area: "planned-notifications",
      severity: "warning",
      title: "Notification queue has SLA breaches",
      detail: `${notifications.over72hCount} unresolved notification item(s) are older than 72 hours.`,
      metricValue: notifications.over72hCount,
    });
  }

  const latestGeoRun = [...input.geoRuns].sort((left, right) =>
    right.startedAt.localeCompare(left.startedAt),
  )[0] ?? null;
  const timeoutCount = latestGeoRun ? countGeoTimeouts(latestGeoRun.notes) : 0;
  const geo: OperationsHealthGeoSummary = {
    latestRunStatus: latestGeoRun?.status ?? null,
    latestRunStartedAt: latestGeoRun?.startedAt ?? null,
    stale: latestGeoRun?.startedAt.slice(0, 10) !== input.runDate,
    timeoutCount,
    activePromptCount: latestGeoRun?.activePromptCount ?? 0,
    createdLogCount: latestGeoRun?.createdLogCount ?? 0,
    failedCount: latestGeoRun?.failedCount ?? 0,
    machineReadabilityReadyCount: latestGeoRun?.machineReadabilityReadyCount ?? 0,
  };

  if (!latestGeoRun || geo.stale) {
    alerts.push({
      area: "geo-monitoring",
      severity: "warning",
      title: "GEO monitoring is stale",
      detail: `No completed GEO monitoring run has been recorded for ${input.runDate}.`,
      metricValue: null,
    });
  } else if (latestGeoRun.status === "failed") {
    alerts.push({
      area: "geo-monitoring",
      severity: "critical",
      title: "Latest GEO monitoring run failed",
      detail: "The latest GEO monitoring pass failed and needs recovery.",
      metricValue: latestGeoRun.failedCount,
    });
  } else if (latestGeoRun.status === "partial") {
    alerts.push({
      area: "geo-monitoring",
      severity: "warning",
      title: "Latest GEO monitoring run is partial",
      detail: "The latest GEO monitoring pass completed with partial coverage.",
      metricValue: latestGeoRun.failedCount,
    });
  }

  if (timeoutCount > 0) {
    alerts.push({
      area: "geo-monitoring",
      severity: "warning",
      title: "GEO engine checks timed out",
      detail: `${timeoutCount} GEO engine timeout signal(s) were detected in the latest monitoring notes.`,
      metricValue: timeoutCount,
    });
  }

  const billingQueueItems = input.plannedNotificationQueue.items.filter(
    (item) => item.notificationFamily === "billing-status-update",
  );
  const billingHistoryToday = input.plannedNotificationHistory.filter(
    (entry) =>
      entry.notificationFamily === "billing-status-update" &&
      entry.runDate === input.runDate,
  );
  const billing: OperationsHealthBillingSummary = {
    actionableCount: billingQueueItems.length,
    sentTodayCount: billingHistoryToday.filter((entry) => entry.status === "sent")
      .length,
    failedTodayCount: billingHistoryToday.filter(
      (entry) => entry.status === "failed",
    ).length,
    dedupedTodayCount: billingHistoryToday.filter((entry) => entry.deduped).length,
    escalatedCount: billingQueueItems.filter(
      (item) => item.queueLabel === "Manual intervention required",
    ).length,
  };

  if (billing.actionableCount > 0) {
    alerts.push({
      area: "billing-status",
      severity: "warning",
      title: "Billing notification backlog is active",
      detail: `${billing.actionableCount} billing-status notification item(s) still need automated delivery or manual follow-up.`,
      metricValue: billing.actionableCount,
    });
  }

  return {
    runDate: input.runDate,
    status: getStatusFromAlerts(alerts),
    dailyBrief,
    notifications,
    geo,
    billing,
    alerts,
  };
}
