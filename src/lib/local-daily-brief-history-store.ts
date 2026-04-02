import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  DAILY_BRIEF_REPETITION_RISKS,
  DAILY_BRIEF_STATUSES,
  type DailyBriefHistoryRecord,
  type DailyBriefRepetitionRisk,
  type DailyBriefSourceReference,
  type DailyBriefStatus,
} from "./daily-brief-history-schema";
import type { DailyBriefHistoryStore } from "./daily-brief-history-store-types";
import { IB_PROGRAMMES, type Programme } from "./mvp-types";

type LocalDailyBriefHistoryStoreData = {
  entries: DailyBriefHistoryRecord[];
};

function getStoreFilePath() {
  return (
    process.env.DAILY_SPARKS_DAILY_BRIEF_STORE_PATH ??
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "data",
      "daily-brief-history.json",
    )
  );
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((item) => normalizeString(item))
        .filter((item) => item.length > 0)
    : [];
}

function normalizeProgramme(value: unknown): Programme {
  const normalized = normalizeString(value);
  return IB_PROGRAMMES.includes(normalized as Programme)
    ? (normalized as Programme)
    : "PYP";
}

function normalizeStatus(value: unknown): DailyBriefStatus {
  const normalized = normalizeString(value);
  return DAILY_BRIEF_STATUSES.includes(normalized as DailyBriefStatus)
    ? (normalized as DailyBriefStatus)
    : "draft";
}

function normalizeRepetitionRisk(value: unknown): DailyBriefRepetitionRisk {
  const normalized = normalizeString(value);
  return DAILY_BRIEF_REPETITION_RISKS.includes(
    normalized as DailyBriefRepetitionRisk,
  )
    ? (normalized as DailyBriefRepetitionRisk)
    : "low";
}

function normalizeSourceReference(
  raw: Partial<DailyBriefSourceReference> | undefined,
): DailyBriefSourceReference {
  return {
    sourceId: normalizeString(raw?.sourceId),
    sourceName: normalizeString(raw?.sourceName),
    sourceDomain: normalizeString(raw?.sourceDomain),
    articleTitle: normalizeString(raw?.articleTitle),
    articleUrl: normalizeString(raw?.articleUrl),
  };
}

function normalizeEntry(
  raw: Partial<DailyBriefHistoryRecord> | undefined,
): DailyBriefHistoryRecord {
  const timestamp = new Date().toISOString();

  return {
    id: normalizeString(raw?.id) || crypto.randomUUID(),
    scheduledFor: normalizeString(raw?.scheduledFor),
    headline: normalizeString(raw?.headline),
    summary: normalizeString(raw?.summary),
    programme: normalizeProgramme(raw?.programme),
    status: normalizeStatus(raw?.status),
    topicTags: normalizeStringArray(raw?.topicTags),
    sourceReferences: Array.isArray(raw?.sourceReferences)
      ? raw.sourceReferences.map((reference) =>
          normalizeSourceReference(reference),
        )
      : [],
    aiConnectionId: normalizeString(raw?.aiConnectionId),
    aiConnectionName: normalizeString(raw?.aiConnectionName),
    aiModel: normalizeString(raw?.aiModel),
    promptVersion: normalizeString(raw?.promptVersion),
    repetitionRisk: normalizeRepetitionRisk(raw?.repetitionRisk),
    repetitionNotes: normalizeString(raw?.repetitionNotes),
    adminNotes: normalizeString(raw?.adminNotes),
    briefMarkdown: normalizeString(raw?.briefMarkdown),
    createdAt: normalizeString(raw?.createdAt) || timestamp,
    updatedAt: normalizeString(raw?.updatedAt) || timestamp,
  };
}

async function readStore(): Promise<LocalDailyBriefHistoryStoreData> {
  const filePath = getStoreFilePath();

  try {
    const content = await readFile(filePath, "utf8");
    const parsed = JSON.parse(content) as {
      entries?: DailyBriefHistoryRecord[];
    };

    return {
      entries: Array.isArray(parsed.entries)
        ? parsed.entries.map((entry) => normalizeEntry(entry))
        : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { entries: [] };
    }

    throw error;
  }
}

async function writeStore(store: LocalDailyBriefHistoryStoreData) {
  const filePath = getStoreFilePath();

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(store, null, 2));
}

export const localDailyBriefHistoryStore: DailyBriefHistoryStore = {
  async listEntries() {
    const store = await readStore();
    return store.entries;
  },

  async getEntry(id) {
    const store = await readStore();
    return store.entries.find((entry) => entry.id === id) ?? null;
  },

  async createEntry(record) {
    const normalizedEntry = normalizeEntry(record);
    const store = await readStore();

    await writeStore({
      entries: [...store.entries, normalizedEntry],
    });

    return normalizedEntry;
  },
};
