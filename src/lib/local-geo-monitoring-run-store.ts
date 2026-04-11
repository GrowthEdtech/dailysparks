import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  GEO_MONITORING_QUERY_OUTCOMES,
  GEO_MONITORING_RUN_STATUSES,
  GEO_MONITORING_RUN_SOURCES,
  type GeoMonitoringEngineBreakdown,
  type GeoMonitoringQueryDiagnostic,
  type GeoMonitoringQueryOutcome,
  type GeoMonitoringRunRecord,
  type GeoMonitoringRunSource,
  type GeoMonitoringRunStatus,
} from "./geo-monitoring-run-schema";
import { GEO_ENGINE_TYPES, type GeoEngineType } from "./geo-prompt-schema";
import {
  GEO_SENTIMENT_LABELS,
  GEO_VISIBILITY_MENTION_STATUSES,
  type GeoSentimentLabel,
  type GeoVisibilityMentionStatus,
} from "./geo-visibility-log-schema";
import type { GeoMonitoringRunStore } from "./geo-monitoring-run-store";

type LocalGeoMonitoringRunStoreData = {
  runs: GeoMonitoringRunRecord[];
};

function getStoreFilePath() {
  return (
    process.env.DAILY_SPARKS_GEO_MONITORING_RUN_STORE_PATH ??
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "data",
      "geo-monitoring-runs.json",
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

function normalizeSource(value: unknown): GeoMonitoringRunSource {
  const normalized = normalizeString(value);
  return GEO_MONITORING_RUN_SOURCES.includes(normalized as GeoMonitoringRunSource)
    ? (normalized as GeoMonitoringRunSource)
    : "scheduled";
}

function normalizeStatus(value: unknown): GeoMonitoringRunStatus {
  const normalized = normalizeString(value);
  return GEO_MONITORING_RUN_STATUSES.includes(normalized as GeoMonitoringRunStatus)
    ? (normalized as GeoMonitoringRunStatus)
    : "failed";
}

function normalizeEngine(value: unknown): GeoEngineType {
  const normalized = normalizeString(value);
  return GEO_ENGINE_TYPES.includes(normalized as GeoEngineType)
    ? (normalized as GeoEngineType)
    : "chatgpt-search";
}

function normalizeOutcome(value: unknown): GeoMonitoringQueryOutcome {
  const normalized = normalizeString(value);
  return GEO_MONITORING_QUERY_OUTCOMES.includes(
    normalized as GeoMonitoringQueryOutcome,
  )
    ? (normalized as GeoMonitoringQueryOutcome)
    : "failed";
}

function normalizeMentionStatus(
  value: unknown,
): GeoVisibilityMentionStatus | null {
  const normalized = normalizeString(value);
  return GEO_VISIBILITY_MENTION_STATUSES.includes(
    normalized as GeoVisibilityMentionStatus,
  )
    ? (normalized as GeoVisibilityMentionStatus)
    : null;
}

function normalizeSentiment(value: unknown): GeoSentimentLabel | null {
  const normalized = normalizeString(value);
  return GEO_SENTIMENT_LABELS.includes(normalized as GeoSentimentLabel)
    ? (normalized as GeoSentimentLabel)
    : null;
}

function normalizeEngineBreakdown(
  value: unknown,
): GeoMonitoringEngineBreakdown[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => {
    const breakdown = entry as Partial<GeoMonitoringEngineBreakdown> | undefined;

    return {
      engine: normalizeEngine(breakdown?.engine),
      attemptedCount: normalizeNumber(breakdown?.attemptedCount),
      createdLogCount: normalizeNumber(breakdown?.createdLogCount),
      skippedCount: normalizeNumber(breakdown?.skippedCount),
      failedCount: normalizeNumber(breakdown?.failedCount),
    };
  });
}

function normalizeQueryDiagnostics(
  value: unknown,
): GeoMonitoringQueryDiagnostic[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => {
    const diagnostic =
      entry as Partial<GeoMonitoringQueryDiagnostic> | undefined;

    return {
      promptId: normalizeString(diagnostic?.promptId),
      promptIntentLabel: normalizeString(diagnostic?.promptIntentLabel),
      queryVariant: normalizeString(diagnostic?.queryVariant),
      engine: normalizeEngine(diagnostic?.engine),
      outcome: normalizeOutcome(diagnostic?.outcome),
      mentionStatus: normalizeMentionStatus(diagnostic?.mentionStatus),
      sentiment: normalizeSentiment(diagnostic?.sentiment),
      citationUrlCount: normalizeNumber(diagnostic?.citationUrlCount),
      durationMs: normalizeNumber(diagnostic?.durationMs),
      reason: normalizeString(diagnostic?.reason),
      logId: normalizeString(diagnostic?.logId) || null,
    };
  });
}

function normalizeRunRecord(
  raw: Partial<GeoMonitoringRunRecord> | undefined,
): GeoMonitoringRunRecord {
  const timestamp = new Date().toISOString();

  return {
    id: normalizeString(raw?.id) || crypto.randomUUID(),
    source: normalizeSource(raw?.source),
    status: normalizeStatus(raw?.status),
    activePromptCount: normalizeNumber(raw?.activePromptCount),
    expandedQueryCount: normalizeNumber(raw?.expandedQueryCount),
    engineAttemptCount: normalizeNumber(raw?.engineAttemptCount),
    createdLogCount: normalizeNumber(raw?.createdLogCount),
    skippedCount: normalizeNumber(raw?.skippedCount),
    failedCount: normalizeNumber(raw?.failedCount),
    machineReadabilityReadyCount: normalizeNumber(
      raw?.machineReadabilityReadyCount,
    ),
    rankabilityScore: normalizeNumber(raw?.rankabilityScore),
    citationReadinessScore: normalizeNumber(raw?.citationReadinessScore),
    biasResistanceScore: normalizeNumber(raw?.biasResistanceScore),
    notes: normalizeString(raw?.notes),
    startedAt: normalizeString(raw?.startedAt) || timestamp,
    completedAt: normalizeString(raw?.completedAt) || timestamp,
    engineBreakdown: normalizeEngineBreakdown(raw?.engineBreakdown),
    queryDiagnostics: normalizeQueryDiagnostics(raw?.queryDiagnostics),
  };
}

async function readStore(): Promise<LocalGeoMonitoringRunStoreData> {
  const filePath = getStoreFilePath();

  try {
    const content = await readFile(filePath, "utf8");
    const parsed = JSON.parse(content) as { runs?: GeoMonitoringRunRecord[] };

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

async function writeStore(store: LocalGeoMonitoringRunStoreData) {
  const filePath = getStoreFilePath();

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(store, null, 2));
}

export const localGeoMonitoringRunStore: GeoMonitoringRunStore = {
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

  async updateRun(id, patch) {
    const normalizedId = normalizeString(id);
    const store = await readStore();
    const existingRun = store.runs.find((run) => run.id === normalizedId);
    const nextRecord = normalizeRunRecord({
      ...(existingRun ?? { id: normalizedId }),
      ...patch,
      id: normalizedId,
    });
    const nextRuns = existingRun
      ? store.runs.map((run) => (run.id === normalizedId ? nextRecord : run))
      : [...store.runs, nextRecord];

    await writeStore({
      runs: nextRuns,
    });

    return nextRecord;
  },
};
