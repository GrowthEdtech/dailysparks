import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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

type LocalGeoVisibilityLogStoreData = {
  logs: GeoVisibilityLogRecord[];
};

function getStoreFilePath() {
  return (
    process.env.DAILY_SPARKS_GEO_VISIBILITY_LOG_STORE_PATH ??
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "data",
      "geo-visibility-logs.json",
    )
  );
}

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
  raw: Partial<GeoVisibilityLogRecord> | undefined,
): GeoVisibilityLogRecord {
  return {
    id: normalizeString(raw?.id) || crypto.randomUUID(),
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

async function readStore(): Promise<LocalGeoVisibilityLogStoreData> {
  const filePath = getStoreFilePath();

  try {
    const content = await readFile(filePath, "utf8");
    const parsed = JSON.parse(content) as { logs?: GeoVisibilityLogRecord[] };

    return {
      logs: Array.isArray(parsed.logs)
        ? parsed.logs.map((log) => normalizeLogRecord(log))
        : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { logs: [] };
    }

    throw error;
  }
}

async function writeStore(store: LocalGeoVisibilityLogStoreData) {
  const filePath = getStoreFilePath();

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(store, null, 2));
}

export const localGeoVisibilityLogStore: GeoVisibilityLogStore = {
  async listLogs() {
    const store = await readStore();
    return store.logs;
  },

  async createLog(record) {
    const normalizedRecord = normalizeLogRecord(record);
    const store = await readStore();

    await writeStore({
      logs: [...store.logs, normalizedRecord],
    });

    return normalizedRecord;
  },
};
