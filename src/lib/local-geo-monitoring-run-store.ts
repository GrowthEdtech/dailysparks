import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  GEO_MONITORING_RUN_STATUSES,
  GEO_MONITORING_RUN_SOURCES,
  type GeoMonitoringEngineBreakdown,
  type GeoMonitoringRunRecord,
  type GeoMonitoringRunSource,
  type GeoMonitoringRunStatus,
} from "./geo-monitoring-run-schema";
import { GEO_ENGINE_TYPES, type GeoEngineType } from "./geo-prompt-schema";
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
};
