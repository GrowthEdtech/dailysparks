import { firestoreGeoMonitoringRunStore } from "./firestore-geo-monitoring-run-store";
import type {
  GeoMonitoringEngineBreakdown,
  GeoMonitoringQueryDiagnostic,
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
  rankabilityScore?: number;
  citationReadinessScore?: number;
  biasResistanceScore?: number;
  notes: string;
  startedAt: string;
  completedAt: string;
  engineBreakdown: GeoMonitoringEngineBreakdown[];
  queryDiagnostics?: GeoMonitoringQueryDiagnostic[];
};

export type UpdateGeoMonitoringRunInput = Partial<
  Omit<CreateGeoMonitoringRunInput, "id">
>;

export type GeoMonitoringRunStore = {
  listRuns(): Promise<GeoMonitoringRunRecord[]>;
  createRun(record: GeoMonitoringRunRecord): Promise<GeoMonitoringRunRecord>;
  updateRun(
    id: string,
    patch: Partial<GeoMonitoringRunRecord>,
  ): Promise<GeoMonitoringRunRecord>;
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

function normalizeNullableString(value: string | null | undefined) {
  return typeof value === "string" ? normalizeString(value) || null : null;
}

function normalizeEngineBreakdown(entries: GeoMonitoringEngineBreakdown[]) {
  return entries.map((entry) => ({
    engine: entry.engine,
    attemptedCount: normalizeNumber(entry.attemptedCount),
    createdLogCount: normalizeNumber(entry.createdLogCount),
    skippedCount: normalizeNumber(entry.skippedCount),
    failedCount: normalizeNumber(entry.failedCount),
  }));
}

function normalizeQueryDiagnostics(entries?: GeoMonitoringQueryDiagnostic[]) {
  return (entries ?? []).map((entry) => ({
    promptId: normalizeString(entry.promptId),
    promptIntentLabel: normalizeString(entry.promptIntentLabel),
    queryVariant: normalizeString(entry.queryVariant),
    engine: entry.engine,
    outcome: entry.outcome,
    mentionStatus: entry.mentionStatus,
    sentiment: entry.sentiment,
    citationUrlCount: normalizeNumber(entry.citationUrlCount),
    durationMs: normalizeNumber(entry.durationMs),
    reason: normalizeString(entry.reason),
    logId: normalizeNullableString(entry.logId),
  }));
}

function normalizeRunInput(input: CreateGeoMonitoringRunInput): GeoMonitoringRunRecord {
  return {
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
    rankabilityScore: normalizeNumber(input.rankabilityScore ?? 0),
    citationReadinessScore: normalizeNumber(input.citationReadinessScore ?? 0),
    biasResistanceScore: normalizeNumber(input.biasResistanceScore ?? 0),
    notes: normalizeString(input.notes),
    startedAt: normalizeString(input.startedAt),
    completedAt: normalizeString(input.completedAt),
    engineBreakdown: normalizeEngineBreakdown(input.engineBreakdown),
    queryDiagnostics: normalizeQueryDiagnostics(input.queryDiagnostics),
  };
}

export async function listGeoMonitoringRuns() {
  const runs = await getGeoMonitoringRunStore().listRuns();

  return [...runs].sort((left, right) =>
    right.startedAt.localeCompare(left.startedAt),
  );
}

export async function createGeoMonitoringRun(input: CreateGeoMonitoringRunInput) {
  const nextRun = normalizeRunInput(input);

  return getGeoMonitoringRunStore().createRun(nextRun);
}

export async function updateGeoMonitoringRun(
  id: string,
  input: UpdateGeoMonitoringRunInput,
) {
  const normalizedPatch: Partial<GeoMonitoringRunRecord> = {};

  if (input.source) {
    normalizedPatch.source = input.source;
  }

  if (input.status) {
    normalizedPatch.status = input.status;
  }

  if (typeof input.activePromptCount === "number") {
    normalizedPatch.activePromptCount = normalizeNumber(input.activePromptCount);
  }

  if (typeof input.expandedQueryCount === "number") {
    normalizedPatch.expandedQueryCount = normalizeNumber(input.expandedQueryCount);
  }

  if (typeof input.engineAttemptCount === "number") {
    normalizedPatch.engineAttemptCount = normalizeNumber(input.engineAttemptCount);
  }

  if (typeof input.createdLogCount === "number") {
    normalizedPatch.createdLogCount = normalizeNumber(input.createdLogCount);
  }

  if (typeof input.skippedCount === "number") {
    normalizedPatch.skippedCount = normalizeNumber(input.skippedCount);
  }

  if (typeof input.failedCount === "number") {
    normalizedPatch.failedCount = normalizeNumber(input.failedCount);
  }

  if (typeof input.machineReadabilityReadyCount === "number") {
    normalizedPatch.machineReadabilityReadyCount = normalizeNumber(
      input.machineReadabilityReadyCount,
    );
  }

  if (typeof input.rankabilityScore === "number") {
    normalizedPatch.rankabilityScore = normalizeNumber(input.rankabilityScore);
  }

  if (typeof input.citationReadinessScore === "number") {
    normalizedPatch.citationReadinessScore = normalizeNumber(
      input.citationReadinessScore,
    );
  }

  if (typeof input.biasResistanceScore === "number") {
    normalizedPatch.biasResistanceScore = normalizeNumber(input.biasResistanceScore);
  }

  if (typeof input.notes === "string") {
    normalizedPatch.notes = normalizeString(input.notes);
  }

  if (typeof input.startedAt === "string") {
    normalizedPatch.startedAt = normalizeString(input.startedAt);
  }

  if (typeof input.completedAt === "string") {
    normalizedPatch.completedAt = normalizeString(input.completedAt);
  }

  if (input.engineBreakdown) {
    normalizedPatch.engineBreakdown = normalizeEngineBreakdown(input.engineBreakdown);
  }

  if (input.queryDiagnostics) {
    normalizedPatch.queryDiagnostics = normalizeQueryDiagnostics(
      input.queryDiagnostics,
    );
  }

  return getGeoMonitoringRunStore().updateRun(id, normalizedPatch);
}
