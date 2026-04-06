import { firestoreGeoMonitoringRunStore } from "./firestore-geo-monitoring-run-store";
import type {
  GeoMonitoringEngineBreakdown,
  GeoMonitoringRunRecord,
  GeoMonitoringRunSource,
  GeoMonitoringRunStatus,
} from "./geo-monitoring-run-schema";
import { localGeoMonitoringRunStore } from "./local-geo-monitoring-run-store";
import {
  getProfileStoreBackend,
  validateProfileStoreConfig,
} from "./profile-store-config";

export type CreateGeoMonitoringRunInput = {
  id?: string;
  source: GeoMonitoringRunSource;
  status: GeoMonitoringRunStatus;
  activePromptCount: number;
  expandedQueryCount: number;
  engineAttemptCount: number;
  createdLogCount: number;
  skippedCount: number;
  failedCount: number;
  machineReadabilityReadyCount: number;
  notes: string;
  startedAt: string;
  completedAt: string;
  engineBreakdown: GeoMonitoringEngineBreakdown[];
};

export type GeoMonitoringRunStore = {
  listRuns(): Promise<GeoMonitoringRunRecord[]>;
  createRun(record: GeoMonitoringRunRecord): Promise<GeoMonitoringRunRecord>;
};

function getGeoMonitoringRunStore(): GeoMonitoringRunStore {
  validateProfileStoreConfig();

  return getProfileStoreBackend() === "firestore"
    ? firestoreGeoMonitoringRunStore
    : localGeoMonitoringRunStore;
}

function normalizeString(value: string) {
  return value.trim();
}

function normalizeNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export async function listGeoMonitoringRuns() {
  const runs = await getGeoMonitoringRunStore().listRuns();

  return [...runs].sort((left, right) =>
    right.startedAt.localeCompare(left.startedAt),
  );
}

export async function createGeoMonitoringRun(input: CreateGeoMonitoringRunInput) {
  const nextRun: GeoMonitoringRunRecord = {
    id: input.id?.trim() || crypto.randomUUID(),
    source: input.source,
    status: input.status,
    activePromptCount: normalizeNumber(input.activePromptCount),
    expandedQueryCount: normalizeNumber(input.expandedQueryCount),
    engineAttemptCount: normalizeNumber(input.engineAttemptCount),
    createdLogCount: normalizeNumber(input.createdLogCount),
    skippedCount: normalizeNumber(input.skippedCount),
    failedCount: normalizeNumber(input.failedCount),
    machineReadabilityReadyCount: normalizeNumber(
      input.machineReadabilityReadyCount,
    ),
    notes: normalizeString(input.notes),
    startedAt: normalizeString(input.startedAt),
    completedAt: normalizeString(input.completedAt),
    engineBreakdown: input.engineBreakdown.map((entry) => ({
      engine: entry.engine,
      attemptedCount: normalizeNumber(entry.attemptedCount),
      createdLogCount: normalizeNumber(entry.createdLogCount),
      skippedCount: normalizeNumber(entry.skippedCount),
      failedCount: normalizeNumber(entry.failedCount),
    })),
  };

  return getGeoMonitoringRunStore().createRun(nextRun);
}
