import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  DailyBriefNotebookEntryRecord,
  DailyBriefNotebookEntryOrigin,
  DailyBriefNotebookEntryType,
  DailyBriefNotebookSavedSource,
} from "./daily-brief-notebook-schema";
import {
  DAILY_BRIEF_NOTEBOOK_ENTRY_TYPES,
} from "./daily-brief-notebook-schema";
import type {
  DailyBriefNotebookFilters,
  DailyBriefNotebookStore,
} from "./daily-brief-notebook-store-types";

type LocalDailyBriefNotebookStoreData = {
  entries: DailyBriefNotebookEntryRecord[];
};

function getStoreFilePath() {
  return (
    process.env.DAILY_SPARKS_DAILY_BRIEF_NOTEBOOK_STORE_PATH ??
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "data",
      "daily-brief-notebook.json",
    )
  );
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((entry) => normalizeString(entry))
        .filter(Boolean)
    : [];
}

function normalizeEntryType(value: unknown): DailyBriefNotebookEntryType {
  return DAILY_BRIEF_NOTEBOOK_ENTRY_TYPES.includes(
    value as DailyBriefNotebookEntryType,
  )
    ? (value as DailyBriefNotebookEntryType)
    : "generic-note";
}

function normalizeEntryOrigin(value: unknown): DailyBriefNotebookEntryOrigin {
  return value === "authored" ? "authored" : "system";
}

function normalizeSavedSource(value: unknown): DailyBriefNotebookSavedSource {
  return value === "reflection" ? "reflection" : "dashboard";
}

function normalizeEntry(
  raw: Partial<DailyBriefNotebookEntryRecord> | undefined,
): DailyBriefNotebookEntryRecord {
  const timestamp = new Date().toISOString();

  return {
    id: normalizeString(raw?.id) || crypto.randomUUID(),
    parentId: normalizeString(raw?.parentId),
    parentEmail: normalizeString(raw?.parentEmail).toLowerCase(),
    studentId: normalizeString(raw?.studentId),
    programme:
      raw?.programme === "MYP" || raw?.programme === "DP" || raw?.programme === "PYP"
        ? raw.programme
        : "MYP",
    entryType: normalizeEntryType(raw?.entryType),
    entryOrigin: normalizeEntryOrigin(raw?.entryOrigin),
    title: normalizeString(raw?.title),
    body: normalizeString(raw?.body),
    knowledgeBankTitle: normalizeString(raw?.knowledgeBankTitle),
    sourceBriefId: normalizeString(raw?.sourceBriefId),
    sourceScheduledFor: normalizeString(raw?.sourceScheduledFor),
    sourceHeadline: normalizeString(raw?.sourceHeadline),
    topicTags: normalizeStringArray(raw?.topicTags),
    interestTags: normalizeStringArray(raw?.interestTags),
    savedSource: normalizeSavedSource(raw?.savedSource),
    savedAt: normalizeString(raw?.savedAt) || timestamp,
    createdAt: normalizeString(raw?.createdAt) || timestamp,
    updatedAt:
      normalizeString(raw?.updatedAt) ||
      normalizeString(raw?.savedAt) ||
      normalizeString(raw?.createdAt) ||
      timestamp,
  };
}

function createEmptyStore(): LocalDailyBriefNotebookStoreData {
  return {
    entries: [],
  };
}

function normalizeStore(rawStore: unknown): LocalDailyBriefNotebookStoreData {
  if (!rawStore || typeof rawStore !== "object") {
    return createEmptyStore();
  }

  const entries = Array.isArray((rawStore as { entries?: unknown }).entries)
    ? (
        (rawStore as { entries: Array<Partial<DailyBriefNotebookEntryRecord>> })
          .entries
      ).map((entry) => normalizeEntry(entry))
    : [];

  return { entries };
}

async function readStore(): Promise<LocalDailyBriefNotebookStoreData> {
  const filePath = getStoreFilePath();

  try {
    const content = await readFile(filePath, "utf8");
    return normalizeStore(JSON.parse(content) as unknown);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return createEmptyStore();
    }

    throw error;
  }
}

async function writeStore(store: LocalDailyBriefNotebookStoreData) {
  const filePath = getStoreFilePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(store, null, 2));
}

function sortEntries(entries: DailyBriefNotebookEntryRecord[]) {
  return [...entries].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

function matchesFilters(
  entry: DailyBriefNotebookEntryRecord,
  filters: DailyBriefNotebookFilters,
) {
  if (filters.parentId && entry.parentId !== filters.parentId.trim()) {
    return false;
  }

  if (filters.studentId && entry.studentId !== filters.studentId.trim()) {
    return false;
  }

  if (filters.programme && entry.programme !== filters.programme) {
    return false;
  }

  if (filters.entryOrigin && entry.entryOrigin !== filters.entryOrigin) {
    return false;
  }

  return true;
}

export const localDailyBriefNotebookStore: DailyBriefNotebookStore = {
  async listEntries(filters = {}) {
    const store = await readStore();
    const entries = sortEntries(store.entries).filter((entry) =>
      matchesFilters(entry, filters),
    );

    return typeof filters.limit === "number" && filters.limit > 0
      ? entries.slice(0, filters.limit)
      : entries;
  },

  async createEntry(record) {
    const store = await readStore();
    const normalized = normalizeEntry(record);
    store.entries.push(normalized);
    await writeStore(store);
    return normalized;
  },

  async upsertEntry(record) {
    const store = await readStore();
    const normalized = normalizeEntry(record);
    const existingIndex = store.entries.findIndex(
      (entry) => entry.id === normalized.id,
    );

    if (existingIndex >= 0) {
      store.entries[existingIndex] = normalized;
    } else {
      store.entries.push(normalized);
    }

    await writeStore(store);
    return normalized;
  },
};
