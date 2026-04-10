import { getFirebaseAdminDb } from "./firebase-admin";
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
  id: string,
  raw: Partial<GeoMonitoringRunRecord> | undefined,
): GeoMonitoringRunRecord {
  const timestamp = new Date().toISOString();

  return {
    id,
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

export const firestoreGeoMonitoringRunStore: GeoMonitoringRunStore = {
  async listRuns() {
    const snapshot = await getFirebaseAdminDb()
      .collection("geoMonitoringRuns")
      .get();

    return snapshot.docs.map((document) =>
      normalizeRunRecord(
        document.id,
        document.data() as Partial<GeoMonitoringRunRecord> | undefined,
      ),
    );
  },

  async createRun(record) {
    const nextRecord = normalizeRunRecord(record.id, record);

    await getFirebaseAdminDb()
      .collection("geoMonitoringRuns")
      .doc(nextRecord.id)
      .set(nextRecord);

    return nextRecord;
  },
};
