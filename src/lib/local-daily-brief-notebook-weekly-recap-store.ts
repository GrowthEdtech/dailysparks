import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  DailyBriefNotebookWeeklyRecapFilters,
  DailyBriefNotebookWeeklyRecapStore,
} from "./daily-brief-notebook-weekly-recap-store-types";
import type {
  DailyBriefNotebookWeeklyRecapRecord,
  DailyBriefNotebookWeeklyRecapResponseRecord,
} from "./daily-brief-notebook-weekly-recap-store-schema";
import {
  DAILY_BRIEF_NOTEBOOK_ENTRY_TYPES,
} from "./daily-brief-notebook-schema";

type LocalDailyBriefNotebookWeeklyRecapStoreData = {
  recaps: DailyBriefNotebookWeeklyRecapRecord[];
};

function getStoreFilePath() {
  return (
    process.env.DAILY_SPARKS_DAILY_BRIEF_NOTEBOOK_WEEKLY_RECAP_STORE_PATH ??
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "data",
      "daily-brief-notebook-weekly-recaps.json",
    )
  );
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((entry) => normalizeString(entry)).filter(Boolean)
    : [];
}

function normalizeResponse(
  raw: Partial<DailyBriefNotebookWeeklyRecapResponseRecord> | undefined,
): DailyBriefNotebookWeeklyRecapResponseRecord {
  const timestamp = new Date().toISOString();

  return {
    id: normalizeString(raw?.id) || crypto.randomUUID(),
    promptEntryId: normalizeString(raw?.promptEntryId),
    entryType: DAILY_BRIEF_NOTEBOOK_ENTRY_TYPES.includes(raw?.entryType as never)
      ? (raw?.entryType as DailyBriefNotebookWeeklyRecapResponseRecord["entryType"])
      : "generic-note",
    title: normalizeString(raw?.title),
    prompt: normalizeString(raw?.prompt),
    sourceHeadline: normalizeString(raw?.sourceHeadline),
    response: normalizeString(raw?.response),
    createdAt: normalizeString(raw?.createdAt) || timestamp,
    updatedAt: normalizeString(raw?.updatedAt) || timestamp,
  };
}

function normalizeRecap(
  raw: Partial<DailyBriefNotebookWeeklyRecapRecord> | undefined,
): DailyBriefNotebookWeeklyRecapRecord {
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
    weekKey: normalizeString(raw?.weekKey),
    weekLabel: normalizeString(raw?.weekLabel),
    title: normalizeString(raw?.title),
    totalEntries: typeof raw?.totalEntries === "number" ? raw.totalEntries : 0,
    systemCount: typeof raw?.systemCount === "number" ? raw.systemCount : 0,
    authoredCount: typeof raw?.authoredCount === "number" ? raw.authoredCount : 0,
    topTags: normalizeStringArray(raw?.topTags),
    summaryLines: normalizeStringArray(raw?.summaryLines),
    entryTypeBreakdown: Array.isArray(raw?.entryTypeBreakdown)
      ? raw.entryTypeBreakdown
          .map((entry) => ({
            entryType: DAILY_BRIEF_NOTEBOOK_ENTRY_TYPES.includes(entry?.entryType as never)
              ? (entry.entryType as DailyBriefNotebookWeeklyRecapRecord["entryTypeBreakdown"][number]["entryType"])
              : "generic-note",
            label: normalizeString(entry?.label),
            count: typeof entry?.count === "number" ? entry.count : 0,
          }))
          .filter((entry) => entry.label)
      : [],
    highlights: Array.isArray(raw?.highlights)
      ? raw.highlights.map((entry) => ({
          entryId: normalizeString(entry?.entryId),
          title: normalizeString(entry?.title),
          body: normalizeString(entry?.body),
          entryType: DAILY_BRIEF_NOTEBOOK_ENTRY_TYPES.includes(entry?.entryType as never)
            ? (entry.entryType as DailyBriefNotebookWeeklyRecapRecord["highlights"][number]["entryType"])
            : "generic-note",
          entryOrigin: entry?.entryOrigin === "authored" ? "authored" : "system",
          sourceHeadline: normalizeString(entry?.sourceHeadline),
          updatedAt: normalizeString(entry?.updatedAt) || timestamp,
        }))
      : [],
    retrievalPrompts: Array.isArray(raw?.retrievalPrompts)
      ? raw.retrievalPrompts.map((prompt) => ({
          entryId: normalizeString(prompt?.entryId),
          title: normalizeString(prompt?.title),
          prompt: normalizeString(prompt?.prompt),
          entryType: DAILY_BRIEF_NOTEBOOK_ENTRY_TYPES.includes(prompt?.entryType as never)
            ? (prompt.entryType as DailyBriefNotebookWeeklyRecapRecord["retrievalPrompts"][number]["entryType"])
            : "generic-note",
          sourceHeadline: normalizeString(prompt?.sourceHeadline),
        }))
      : [],
    retrievalResponses: Array.isArray(raw?.retrievalResponses)
      ? raw.retrievalResponses.map((entry) => normalizeResponse(entry))
      : [],
    notionLastSyncedAt: normalizeString(raw?.notionLastSyncedAt) || null,
    notionLastSyncPageId: normalizeString(raw?.notionLastSyncPageId) || null,
    notionLastSyncPageUrl: normalizeString(raw?.notionLastSyncPageUrl) || null,
    createdAt: normalizeString(raw?.createdAt) || timestamp,
    updatedAt: normalizeString(raw?.updatedAt) || timestamp,
  };
}

function createEmptyStore(): LocalDailyBriefNotebookWeeklyRecapStoreData {
  return {
    recaps: [],
  };
}

function normalizeStore(rawStore: unknown): LocalDailyBriefNotebookWeeklyRecapStoreData {
  if (!rawStore || typeof rawStore !== "object") {
    return createEmptyStore();
  }

  const recaps = Array.isArray((rawStore as { recaps?: unknown }).recaps)
    ? (
        (rawStore as { recaps: Array<Partial<DailyBriefNotebookWeeklyRecapRecord>> })
          .recaps
      ).map((recap) => normalizeRecap(recap))
    : [];

  return { recaps };
}

async function readStore(): Promise<LocalDailyBriefNotebookWeeklyRecapStoreData> {
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

async function writeStore(store: LocalDailyBriefNotebookWeeklyRecapStoreData) {
  const filePath = getStoreFilePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(store, null, 2));
}

function sortRecaps(recaps: DailyBriefNotebookWeeklyRecapRecord[]) {
  return [...recaps].sort((left, right) =>
    right.weekKey.localeCompare(left.weekKey) || right.updatedAt.localeCompare(left.updatedAt),
  );
}

function matchesFilters(
  recap: DailyBriefNotebookWeeklyRecapRecord,
  filters: DailyBriefNotebookWeeklyRecapFilters,
) {
  if (filters.parentId && recap.parentId !== filters.parentId.trim()) {
    return false;
  }

  if (filters.studentId && recap.studentId !== filters.studentId.trim()) {
    return false;
  }

  if (filters.programme && recap.programme !== filters.programme) {
    return false;
  }

  if (filters.weekKey && recap.weekKey !== filters.weekKey.trim()) {
    return false;
  }

  return true;
}

export const localDailyBriefNotebookWeeklyRecapStore: DailyBriefNotebookWeeklyRecapStore =
  {
    async listRecaps(filters = {}) {
      const store = await readStore();
      const recaps = sortRecaps(store.recaps).filter((recap) =>
        matchesFilters(recap, filters),
      );

      return typeof filters.limit === "number" && filters.limit > 0
        ? recaps.slice(0, filters.limit)
        : recaps;
    },

    async upsertRecap(record) {
      const store = await readStore();
      const normalized = normalizeRecap(record);
      const existingIndex = store.recaps.findIndex((entry) => entry.id === normalized.id);

      if (existingIndex >= 0) {
        store.recaps[existingIndex] = normalized;
      } else {
        store.recaps.push(normalized);
      }

      await writeStore(store);
      return normalized;
    },
  };
