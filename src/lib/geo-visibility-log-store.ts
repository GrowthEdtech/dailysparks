import { firestoreGeoVisibilityLogStore } from "./firestore-geo-visibility-log-store";
import {
  type GeoEntityAccuracyLabel,
  type GeoSentimentLabel,
  type GeoVisibilityLogRecord,
  type GeoVisibilityLogSource,
  type GeoVisibilityMentionStatus,
} from "./geo-visibility-log-schema";
import { type GeoEngineType } from "./geo-prompt-schema";
import { localGeoVisibilityLogStore } from "./local-geo-visibility-log-store";
import {
  getProfileStoreBackend,
  validateProfileStoreConfig,
} from "./profile-store-config";

export type CreateGeoVisibilityLogInput = {
  source?: GeoVisibilityLogSource;
  monitoringRunId?: string | null;
  promptId: string;
  promptTextSnapshot: string;
  queryVariant?: string;
  engine: GeoEngineType;
  engineModel?: string;
  mentionStatus: GeoVisibilityMentionStatus;
  citationUrls: string[];
  shareOfModelScore: number;
  citationShareScore: number;
  sentiment: GeoSentimentLabel;
  entityAccuracy: GeoEntityAccuracyLabel;
  responseExcerpt: string;
  notes: string;
};

export type GeoVisibilityLogStore = {
  listLogs(): Promise<GeoVisibilityLogRecord[]>;
  createLog(record: GeoVisibilityLogRecord): Promise<GeoVisibilityLogRecord>;
};

function getGeoVisibilityLogStore(): GeoVisibilityLogStore {
  validateProfileStoreConfig();

  return getProfileStoreBackend() === "firestore"
    ? firestoreGeoVisibilityLogStore
    : localGeoVisibilityLogStore;
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

function trimString(value: string) {
  return value.trim();
}

function trimStringList(values: string[]) {
  return values.map((value) => trimString(value)).filter(Boolean);
}

export async function listGeoVisibilityLogs() {
  const logs = await getGeoVisibilityLogStore().listLogs();

  return [...logs].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

export async function createGeoVisibilityLog(input: CreateGeoVisibilityLogInput) {
  const timestamp = new Date().toISOString();
  const nextLog: GeoVisibilityLogRecord = {
    id: crypto.randomUUID(),
    source: input.source ?? "manual",
    monitoringRunId: input.monitoringRunId?.trim() || null,
    promptId: trimString(input.promptId),
    promptTextSnapshot: trimString(input.promptTextSnapshot),
    queryVariant: trimString(input.queryVariant ?? input.promptTextSnapshot),
    engine: input.engine,
    engineModel: trimString(input.engineModel ?? ""),
    mentionStatus: input.mentionStatus,
    citationUrls: trimStringList(input.citationUrls),
    shareOfModelScore: clampScore(input.shareOfModelScore),
    citationShareScore: clampScore(input.citationShareScore),
    sentiment: input.sentiment,
    entityAccuracy: input.entityAccuracy,
    responseExcerpt: trimString(input.responseExcerpt),
    notes: trimString(input.notes),
    createdAt: timestamp,
  };

  return getGeoVisibilityLogStore().createLog(nextLog);
}
