import { getFirebaseAdminDb } from "./firebase-admin";
import type {
  DailyBriefNotebookEntryRecord,
  DailyBriefNotebookEntryType,
} from "./daily-brief-notebook-schema";
import {
  DAILY_BRIEF_NOTEBOOK_ENTRY_TYPES,
} from "./daily-brief-notebook-schema";
import type {
  DailyBriefNotebookFilters,
  DailyBriefNotebookStore,
} from "./daily-brief-notebook-store-types";

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

function normalizeEntry(
  id: string,
  raw: Partial<DailyBriefNotebookEntryRecord> | undefined,
): DailyBriefNotebookEntryRecord {
  const timestamp = new Date().toISOString();

  return {
    id,
    parentId: normalizeString(raw?.parentId),
    parentEmail: normalizeString(raw?.parentEmail).toLowerCase(),
    studentId: normalizeString(raw?.studentId),
    programme:
      raw?.programme === "MYP" || raw?.programme === "DP" || raw?.programme === "PYP"
        ? raw.programme
        : "MYP",
    entryType: normalizeEntryType(raw?.entryType),
    title: normalizeString(raw?.title),
    body: normalizeString(raw?.body),
    knowledgeBankTitle: normalizeString(raw?.knowledgeBankTitle),
    sourceBriefId: normalizeString(raw?.sourceBriefId),
    sourceScheduledFor: normalizeString(raw?.sourceScheduledFor),
    sourceHeadline: normalizeString(raw?.sourceHeadline),
    topicTags: normalizeStringArray(raw?.topicTags),
    interestTags: normalizeStringArray(raw?.interestTags),
    savedSource: "dashboard",
    savedAt: normalizeString(raw?.savedAt) || timestamp,
    createdAt: normalizeString(raw?.createdAt) || timestamp,
  };
}

function sortEntries(entries: DailyBriefNotebookEntryRecord[]) {
  return [...entries].sort((left, right) => right.savedAt.localeCompare(left.savedAt));
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

  return true;
}

export const firestoreDailyBriefNotebookStore: DailyBriefNotebookStore = {
  async listEntries(filters = {}) {
    const db = getFirebaseAdminDb();
    let query = db.collection("dailyBriefNotebook") as FirebaseFirestore.Query;

    if (filters.parentId) {
      query = query.where("parentId", "==", filters.parentId.trim());
    }

    if (filters.studentId) {
      query = query.where("studentId", "==", filters.studentId.trim());
    }

    if (filters.programme) {
      query = query.where("programme", "==", filters.programme);
    }

    const snapshot = await query.get();
    const entries = sortEntries(
      snapshot.docs
        .map((document) =>
          normalizeEntry(
            document.id,
            document.data() as Partial<DailyBriefNotebookEntryRecord> | undefined,
          ),
        )
        .filter((entry) => matchesFilters(entry, filters)),
    );

    return typeof filters.limit === "number" && filters.limit > 0
      ? entries.slice(0, filters.limit)
      : entries;
  },

  async createEntry(record) {
    const db = getFirebaseAdminDb();
    const normalized = normalizeEntry(record.id, record);
    await db.collection("dailyBriefNotebook").doc(normalized.id).set(normalized);
    return normalized;
  },
};
