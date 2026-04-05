import { getFirebaseAdminDb } from "./firebase-admin";
import {
  GEO_ENTITY_ACCURACY_LABELS,
  GEO_SENTIMENT_LABELS,
  GEO_VISIBILITY_MENTION_STATUSES,
  type GeoEntityAccuracyLabel,
  type GeoSentimentLabel,
  type GeoVisibilityLogRecord,
  type GeoVisibilityMentionStatus,
} from "./geo-visibility-log-schema";
import { GEO_ENGINE_TYPES, type GeoEngineType } from "./geo-prompt-schema";
import type { GeoVisibilityLogStore } from "./geo-visibility-log-store";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => normalizeString(item)).filter(Boolean);
}

function normalizeScore(value: unknown) {
  const nextValue = Number(value);

  if (!Number.isFinite(nextValue)) {
    return 0;
  }

  return Math.min(1, Math.max(0, nextValue));
}

function normalizeEngine(value: unknown): GeoEngineType {
  const normalized = normalizeString(value);
  return GEO_ENGINE_TYPES.includes(normalized as GeoEngineType)
    ? (normalized as GeoEngineType)
    : "chatgpt-search";
}

function normalizeMentionStatus(value: unknown): GeoVisibilityMentionStatus {
  const normalized = normalizeString(value);
  return GEO_VISIBILITY_MENTION_STATUSES.includes(
    normalized as GeoVisibilityMentionStatus,
  )
    ? (normalized as GeoVisibilityMentionStatus)
    : "not-mentioned";
}

function normalizeSentiment(value: unknown): GeoSentimentLabel {
  const normalized = normalizeString(value);
  return GEO_SENTIMENT_LABELS.includes(normalized as GeoSentimentLabel)
    ? (normalized as GeoSentimentLabel)
    : "neutral";
}

function normalizeEntityAccuracy(value: unknown): GeoEntityAccuracyLabel {
  const normalized = normalizeString(value);
  return GEO_ENTITY_ACCURACY_LABELS.includes(
    normalized as GeoEntityAccuracyLabel,
  )
    ? (normalized as GeoEntityAccuracyLabel)
    : "mixed";
}

function normalizeLogRecord(
  id: string,
  raw: Partial<GeoVisibilityLogRecord> | undefined,
): GeoVisibilityLogRecord {
  return {
    id,
    promptId: normalizeString(raw?.promptId),
    promptTextSnapshot: normalizeString(raw?.promptTextSnapshot),
    engine: normalizeEngine(raw?.engine),
    mentionStatus: normalizeMentionStatus(raw?.mentionStatus),
    citationUrls: normalizeStringList(raw?.citationUrls),
    shareOfModelScore: normalizeScore(raw?.shareOfModelScore),
    citationShareScore: normalizeScore(raw?.citationShareScore),
    sentiment: normalizeSentiment(raw?.sentiment),
    entityAccuracy: normalizeEntityAccuracy(raw?.entityAccuracy),
    responseExcerpt: normalizeString(raw?.responseExcerpt),
    notes: normalizeString(raw?.notes),
    createdAt: normalizeString(raw?.createdAt) || new Date().toISOString(),
  };
}

export const firestoreGeoVisibilityLogStore: GeoVisibilityLogStore = {
  async listLogs() {
    const snapshot = await getFirebaseAdminDb()
      .collection("geoVisibilityLogs")
      .get();

    return snapshot.docs.map((document) =>
      normalizeLogRecord(
        document.id,
        document.data() as Partial<GeoVisibilityLogRecord> | undefined,
      ),
    );
  },

  async createLog(record) {
    const nextLog = normalizeLogRecord(record.id, record);

    await getFirebaseAdminDb()
      .collection("geoVisibilityLogs")
      .doc(nextLog.id)
      .set(nextLog);

    return nextLog;
  },
};
