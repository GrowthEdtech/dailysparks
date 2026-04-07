import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  OPERATIONS_HEALTH_ALERT_AREAS,
  OPERATIONS_HEALTH_ALERT_SEVERITIES,
  OPERATIONS_HEALTH_REMEDIATION_ACTIONS,
  OPERATIONS_HEALTH_REMEDIATION_STATUSES,
  OPERATIONS_HEALTH_RUN_SOURCES,
  OPERATIONS_HEALTH_RUN_STATUSES,
  type OperationsHealthAlert,
  type OperationsHealthRemediationAction,
  type OperationsHealthRunRecord,
  type OperationsHealthRunSource,
  type OperationsHealthRunStatus,
} from "./operations-health-run-schema";
import type { OperationsHealthRunStore } from "./operations-health-run-store-types";

type LocalOperationsHealthRunStoreData = {
  runs: OperationsHealthRunRecord[];
};

function getStoreFilePath() {
  return (
    process.env.DAILY_SPARKS_OPERATIONS_HEALTH_RUN_STORE_PATH ??
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "data",
      "operations-health-runs.json",
    )
  );
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNumber(value: unknown) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? Math.max(0, nextValue) : 0;
}

function normalizeSource(value: unknown): OperationsHealthRunSource {
  const normalized = normalizeString(value);
  return OPERATIONS_HEALTH_RUN_SOURCES.includes(
    normalized as OperationsHealthRunSource,
  )
    ? (normalized as OperationsHealthRunSource)
    : "scheduled";
}

function normalizeStatus(value: unknown): OperationsHealthRunStatus {
  const normalized = normalizeString(value);
  return OPERATIONS_HEALTH_RUN_STATUSES.includes(
    normalized as OperationsHealthRunStatus,
  )
    ? (normalized as OperationsHealthRunStatus)
    : "critical";
}

function normalizeAlert(alert: Partial<OperationsHealthAlert> | undefined): OperationsHealthAlert {
  const area = normalizeString(alert?.area);
  const severity = normalizeString(alert?.severity);

  return {
    area: OPERATIONS_HEALTH_ALERT_AREAS.includes(area as OperationsHealthAlert["area"])
      ? (area as OperationsHealthAlert["area"])
      : "daily-brief",
    severity: OPERATIONS_HEALTH_ALERT_SEVERITIES.includes(
      severity as OperationsHealthAlert["severity"],
    )
      ? (severity as OperationsHealthAlert["severity"])
      : "warning",
    title: normalizeString(alert?.title),
    detail: normalizeString(alert?.detail),
    metricValue:
      typeof alert?.metricValue === "number" && Number.isFinite(alert.metricValue)
        ? alert.metricValue
        : null,
    webhookDelivered:
      typeof alert?.webhookDelivered === "boolean"
        ? alert.webhookDelivered
        : null,
    webhookUsed:
      typeof alert?.webhookUsed === "boolean" ? alert.webhookUsed : null,
    emailDelivered:
      typeof alert?.emailDelivered === "boolean" ? alert.emailDelivered : null,
    emailUsed: typeof alert?.emailUsed === "boolean" ? alert.emailUsed : null,
    emailRecipient: normalizeString(alert?.emailRecipient) || null,
    emailMessageId: normalizeString(alert?.emailMessageId) || null,
  };
}

function normalizeRemediationAction(
  action: Partial<OperationsHealthRemediationAction> | undefined,
): OperationsHealthRemediationAction {
  const nextAction = normalizeString(action?.action);
  const nextStatus = normalizeString(action?.status);
  const timestamp = new Date().toISOString();

  return {
    action: OPERATIONS_HEALTH_REMEDIATION_ACTIONS.includes(
      nextAction as OperationsHealthRemediationAction["action"],
    )
      ? (nextAction as OperationsHealthRemediationAction["action"])
      : "retry-delivery",
    status: OPERATIONS_HEALTH_REMEDIATION_STATUSES.includes(
      nextStatus as OperationsHealthRemediationAction["status"],
    )
      ? (nextStatus as OperationsHealthRemediationAction["status"])
      : "skipped",
    detail: normalizeString(action?.detail),
    startedAt: normalizeString(action?.startedAt) || timestamp,
    completedAt: normalizeString(action?.completedAt) || timestamp,
  };
}

function normalizeRunRecord(
  raw: Partial<OperationsHealthRunRecord> | undefined,
): OperationsHealthRunRecord {
  const timestamp = new Date().toISOString();

  return {
    id: normalizeString(raw?.id) || crypto.randomUUID(),
    source: normalizeSource(raw?.source),
    runDate: normalizeString(raw?.runDate) || timestamp.slice(0, 10),
    status: normalizeStatus(raw?.status),
    dailyBrief: {
      expectedProductionCount: normalizeNumber(raw?.dailyBrief?.expectedProductionCount),
      generatedCount: normalizeNumber(raw?.dailyBrief?.generatedCount),
      approvedCount: normalizeNumber(raw?.dailyBrief?.approvedCount),
      publishedCount: normalizeNumber(raw?.dailyBrief?.publishedCount),
      failedCount: normalizeNumber(raw?.dailyBrief?.failedCount),
      missingProductionCount: normalizeNumber(raw?.dailyBrief?.missingProductionCount),
      retryCandidateCount: normalizeNumber(raw?.dailyBrief?.retryCandidateCount),
      blockedCanaryCount: normalizeNumber(raw?.dailyBrief?.blockedCanaryCount),
    },
    notifications: {
      queueCount: normalizeNumber(raw?.notifications?.queueCount),
      pendingCount: normalizeNumber(raw?.notifications?.pendingCount),
      retryDueCount: normalizeNumber(raw?.notifications?.retryDueCount),
      coolingDownCount: normalizeNumber(raw?.notifications?.coolingDownCount),
      escalatedCount: normalizeNumber(raw?.notifications?.escalatedCount),
      dedupedCount: normalizeNumber(raw?.notifications?.dedupedCount),
      under24hCount: normalizeNumber(raw?.notifications?.under24hCount),
      between24hAnd72hCount: normalizeNumber(
        raw?.notifications?.between24hAnd72hCount,
      ),
      over72hCount: normalizeNumber(raw?.notifications?.over72hCount),
    },
    geo: {
      latestRunStatus:
        raw?.geo?.latestRunStatus === "completed" ||
        raw?.geo?.latestRunStatus === "partial" ||
        raw?.geo?.latestRunStatus === "failed"
          ? raw.geo.latestRunStatus
          : null,
      latestRunStartedAt: normalizeString(raw?.geo?.latestRunStartedAt) || null,
      stale: raw?.geo?.stale === true,
      timeoutCount: normalizeNumber(raw?.geo?.timeoutCount),
      activePromptCount: normalizeNumber(raw?.geo?.activePromptCount),
      createdLogCount: normalizeNumber(raw?.geo?.createdLogCount),
      failedCount: normalizeNumber(raw?.geo?.failedCount),
      machineReadabilityReadyCount: normalizeNumber(
        raw?.geo?.machineReadabilityReadyCount,
      ),
    },
    billing: {
      actionableCount: normalizeNumber(raw?.billing?.actionableCount),
      sentTodayCount: normalizeNumber(raw?.billing?.sentTodayCount),
      failedTodayCount: normalizeNumber(raw?.billing?.failedTodayCount),
      dedupedTodayCount: normalizeNumber(raw?.billing?.dedupedTodayCount),
      escalatedCount: normalizeNumber(raw?.billing?.escalatedCount),
    },
    alerts: Array.isArray(raw?.alerts)
      ? raw.alerts.map((alert) => normalizeAlert(alert))
      : [],
    remediationActions: Array.isArray(raw?.remediationActions)
      ? raw.remediationActions.map((action) => normalizeRemediationAction(action))
      : [],
    startedAt: normalizeString(raw?.startedAt) || timestamp,
    completedAt: normalizeString(raw?.completedAt) || timestamp,
  };
}

async function readStore(): Promise<LocalOperationsHealthRunStoreData> {
  const filePath = getStoreFilePath();

  try {
    const content = await readFile(filePath, "utf8");
    const parsed = JSON.parse(content) as { runs?: OperationsHealthRunRecord[] };

    return {
      runs: Array.isArray(parsed.runs)
        ? parsed.runs.map((run) => normalizeRunRecord(run))
        : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { runs: [] };
    }

    throw error;
  }
}

async function writeStore(store: LocalOperationsHealthRunStoreData) {
  const filePath = getStoreFilePath();

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(store, null, 2));
}

export const localOperationsHealthRunStore: OperationsHealthRunStore = {
  async listRuns() {
    const store = await readStore();
    return store.runs;
  },

  async createRun(record) {
    const nextRecord = normalizeRunRecord(record);
    const store = await readStore();

    await writeStore({
      runs: [...store.runs, nextRecord],
    });

    return nextRecord;
  },
};
