import { POST as retryDailyBriefRoute } from "../app/api/internal/daily-brief/retry-delivery/route";
import { POST as geoMonitoringRoute } from "../app/api/internal/geo-monitoring/run/route";
import { POST as growthReconciliationRoute } from "../app/api/internal/growth-reconciliation/run/route";
import {
  getDailyBriefSchedulerHeaderName,
  getDailyBriefSchedulerSecret,
} from "./daily-brief-run-auth";
import type { DailyBriefHistoryRecord } from "./daily-brief-history-schema";
import { listDailyBriefHistory } from "./daily-brief-history-store";
import { getDailyBriefBusinessDate } from "./daily-brief-run-date";
import type { GeoMonitoringRunRecord } from "./geo-monitoring-run-schema";
import { listGeoMonitoringRuns } from "./geo-monitoring-run-store";
import { listParentProfiles } from "./mvp-store";
import type { PlannedNotificationRunRecord } from "./planned-notification-history-schema";
import { listPlannedNotificationRunHistory } from "./planned-notification-history-store";
import {
  buildPlannedNotificationOpsQueue,
  type PlannedNotificationOpsQueue,
} from "./planned-notification-ops";
import {
  emitOperationsHealthAlert,
  type OperationsHealthAlertDispatchResult,
} from "./operations-health-alerts";
import { buildOperationsHealthSnapshot, type OperationsHealthSnapshot } from "./operations-health";
import { createOperationsHealthRun } from "./operations-health-run-store";
import type {
  OperationsHealthRemediationAction,
  OperationsHealthRunRecord,
  OperationsHealthRunSource,
} from "./operations-health-run-schema";

export type OperationsHealthContext = {
  runDate: string;
  dailyBriefHistory: DailyBriefHistoryRecord[];
  plannedNotificationQueue: PlannedNotificationOpsQueue;
  plannedNotificationHistory: PlannedNotificationRunRecord[];
  geoRuns: GeoMonitoringRunRecord[];
};

export type OperationsHealthRunnerResult = {
  run: OperationsHealthRunRecord;
  snapshot: OperationsHealthSnapshot;
};

type RemediationResponse = {
  mode?: string;
  summary?: Record<string, unknown>;
  notificationRun?: Record<string, unknown>;
  run?: Record<string, unknown>;
};

type OperationsHealthRunnerInput = {
  source: OperationsHealthRunSource;
  now?: Date;
  readContext: () => Promise<OperationsHealthContext>;
  runRetryDelivery: (input: {
    runDate: string;
    dispatchTimestamp: string;
  }) => Promise<RemediationResponse>;
  runGrowthReconciliation: (input: { runDate: string }) => Promise<RemediationResponse>;
  runGeoMonitoring: () => Promise<RemediationResponse>;
  emitAlert?: (
    alert: OperationsHealthSnapshot["alerts"][number],
  ) => Promise<OperationsHealthAlertDispatchResult>;
  createRun: (record: OperationsHealthRunRecord) => Promise<OperationsHealthRunRecord>;
};

async function loadOperationsHealthContext(now: Date): Promise<OperationsHealthContext> {
  const runDate = getDailyBriefBusinessDate(now);
  const [dailyBriefHistory, profiles, plannedNotificationHistory, geoRuns] =
    await Promise.all([
      listDailyBriefHistory({
        scheduledFor: runDate,
        recordKind: "production",
      }),
      listParentProfiles(),
      listPlannedNotificationRunHistory(),
      listGeoMonitoringRuns(),
    ]);

  const plannedNotificationQueue = buildPlannedNotificationOpsQueue({
    profiles,
    history: plannedNotificationHistory,
    now,
  });

  return {
    runDate,
    dailyBriefHistory,
    plannedNotificationQueue,
    plannedNotificationHistory,
    geoRuns,
  };
}

function buildSchedulerRequest(pathname: string, body: Record<string, unknown>) {
  return new Request(`http://localhost:3000${pathname}`, {
    method: "POST",
    headers: {
      [getDailyBriefSchedulerHeaderName()]: getDailyBriefSchedulerSecret(),
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function executeJsonRoute(
  route: (request: Request) => Promise<Response>,
  request: Request,
): Promise<RemediationResponse> {
  const response = await route(request);

  if (!response.ok) {
    throw new Error(
      `Route failed with status ${response.status}: ${await response.text()}`,
    );
  }

  return (await response.json()) as RemediationResponse;
}

async function executeRemediationAction(input: {
  action: OperationsHealthRemediationAction["action"];
  shouldRun: boolean;
  detailWhenSkipped: string;
  startedAt: string;
  run: () => Promise<RemediationResponse>;
}): Promise<OperationsHealthRemediationAction> {
  if (!input.shouldRun) {
    return {
      action: input.action,
      status: "skipped",
      detail: input.detailWhenSkipped,
      startedAt: input.startedAt,
      completedAt: input.startedAt,
    };
  }

  try {
    const response = await input.run();
    const summaryJson = JSON.stringify(
      response.summary ?? response.notificationRun ?? response.run ?? {},
    );

    return {
      action: input.action,
      status: "executed",
      detail: summaryJson === "{}"
        ? "Executed successfully."
        : `Executed successfully: ${summaryJson}`,
      startedAt: input.startedAt,
      completedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      action: input.action,
      status: "failed",
      detail:
        error instanceof Error ? error.message : "Remediation action failed.",
      startedAt: input.startedAt,
      completedAt: new Date().toISOString(),
    };
  }
}

export async function runOperationsHealthCycle(
  input: OperationsHealthRunnerInput,
): Promise<OperationsHealthRunnerResult> {
  const startedAt = (input.now ?? new Date()).toISOString();
  const firstContext = await input.readContext();
  const firstSnapshot = buildOperationsHealthSnapshot({
    runDate: firstContext.runDate,
    now: input.now,
    dailyBriefHistory: firstContext.dailyBriefHistory,
    plannedNotificationQueue: firstContext.plannedNotificationQueue,
    plannedNotificationHistory: firstContext.plannedNotificationHistory,
    geoRuns: firstContext.geoRuns,
  });

  const remediationActions: OperationsHealthRemediationAction[] = [];

  remediationActions.push(
    await executeRemediationAction({
      action: "retry-delivery",
      shouldRun: firstSnapshot.dailyBrief.retryCandidateCount > 0,
      detailWhenSkipped: "No retry-eligible Daily Brief failures were detected.",
      startedAt,
      run: () =>
        input.runRetryDelivery({
          runDate: firstContext.runDate,
          dispatchTimestamp: startedAt,
        }),
    }),
  );

  remediationActions.push(
    await executeRemediationAction({
      action: "blocked-canary-review",
      shouldRun: firstSnapshot.dailyBrief.blockedCanaryCount > 0,
      detailWhenSkipped:
        "No production briefs are currently blocked by synthetic canary.",
      startedAt,
      run: async () => ({
        summary: {
          blockedCanaryCount: firstSnapshot.dailyBrief.blockedCanaryCount,
          note:
            "Blocked production waves were held for operator release or manual canary rerun.",
        },
      }),
    }),
  );

  remediationActions.push(
    await executeRemediationAction({
      action: "growth-reconciliation",
      shouldRun:
        firstSnapshot.notifications.pendingCount > 0 ||
        firstSnapshot.notifications.retryDueCount > 0 ||
        firstSnapshot.billing.actionableCount > 0,
      detailWhenSkipped:
        "No actionable notification or billing backlog required automated reconciliation.",
      startedAt,
      run: () =>
        input.runGrowthReconciliation({
          runDate: firstContext.runDate,
        }),
    }),
  );

  remediationActions.push(
    await executeRemediationAction({
      action: "geo-monitoring",
      shouldRun:
        firstSnapshot.geo.stale ||
        firstSnapshot.geo.latestRunStatus !== "completed" ||
        firstSnapshot.geo.timeoutCount > 0,
      detailWhenSkipped: "GEO monitoring is current and healthy.",
      startedAt,
      run: () => input.runGeoMonitoring(),
    }),
  );

  const secondContext = await input.readContext();
  const secondSnapshot = buildOperationsHealthSnapshot({
    runDate: secondContext.runDate,
    now: input.now,
    dailyBriefHistory: secondContext.dailyBriefHistory,
    plannedNotificationQueue: secondContext.plannedNotificationQueue,
    plannedNotificationHistory: secondContext.plannedNotificationHistory,
    geoRuns: secondContext.geoRuns,
  });

  const emitAlert = input.emitAlert ?? emitOperationsHealthAlert;
  const alerts = await Promise.all(
    secondSnapshot.alerts.map(async (alert) => {
      const dispatch = await emitAlert(alert);

      return {
        ...alert,
        webhookDelivered: dispatch.webhookDelivered ?? dispatch.delivered,
        webhookUsed: dispatch.webhookUsed ?? dispatch.usedWebhook,
        emailDelivered: dispatch.emailDelivered ?? null,
        emailUsed: dispatch.emailUsed ?? null,
        emailRecipient: dispatch.emailRecipient ?? null,
        emailMessageId: dispatch.emailMessageId ?? null,
      };
    }),
  );

  const completedAt = new Date().toISOString();
  const run = await input.createRun({
    id: crypto.randomUUID(),
    source: input.source,
    runDate: secondContext.runDate,
    status: secondSnapshot.status,
    dailyBrief: secondSnapshot.dailyBrief,
    notifications: secondSnapshot.notifications,
    geo: secondSnapshot.geo,
    billing: secondSnapshot.billing,
    alerts,
    remediationActions,
    startedAt,
    completedAt,
  });

  return {
    run,
    snapshot: {
      ...secondSnapshot,
      alerts,
    },
  };
}

export async function runOperationsHealthWorkflow(input: {
  source: OperationsHealthRunSource;
  now?: Date;
}) {
  const now = input.now ?? new Date();

  return runOperationsHealthCycle({
    source: input.source,
    now,
    readContext: () => loadOperationsHealthContext(now),
    runRetryDelivery: ({ runDate, dispatchTimestamp }) =>
      executeJsonRoute(
        retryDailyBriefRoute,
        buildSchedulerRequest("/api/internal/daily-brief/retry-delivery", {
          runDate,
          recordKind: "production",
          dispatchTimestamp,
        }),
      ),
    runGrowthReconciliation: () =>
      executeJsonRoute(
        growthReconciliationRoute,
        buildSchedulerRequest("/api/internal/growth-reconciliation/run", {}),
      ),
    runGeoMonitoring: () =>
      executeJsonRoute(
        geoMonitoringRoute,
        buildSchedulerRequest("/api/internal/geo-monitoring/run", {}),
      ),
    createRun: createOperationsHealthRun,
  });
}
