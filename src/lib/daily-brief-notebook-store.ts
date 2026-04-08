import { firestoreDailyBriefNotebookStore } from "./firestore-daily-brief-notebook-store";
import {
  type DailyBriefKnowledgeBankSection,
} from "./daily-brief-knowledge-bank";
import { localDailyBriefNotebookStore } from "./local-daily-brief-notebook-store";
import {
  getDailyBriefNotebookEntryLabel,
  isAuthoredNotebookEntryTypeAllowed,
  type DailyBriefNotebookEntryRecord,
  type DailyBriefNotebookEntryType,
  resolveDailyBriefNotebookEntryType,
} from "./daily-brief-notebook-schema";
import type {
  DailyBriefNotebookFilters,
  DailyBriefNotebookStore,
} from "./daily-brief-notebook-store-types";
import type { Programme } from "./mvp-types";
import {
  getProfileStoreBackend,
  validateProfileStoreConfig,
} from "./profile-store-config";

type SaveDailyBriefNotebookEntriesInput = {
  parentId: string;
  parentEmail: string;
  studentId: string;
  programme: Programme;
  interestTags: string[];
  briefId: string;
  scheduledFor: string;
  headline: string;
  topicTags: string[];
  knowledgeBankTitle: string;
  entries: DailyBriefKnowledgeBankSection[];
};

type SaveDailyBriefNotebookEntriesResult = {
  savedEntries: DailyBriefNotebookEntryRecord[];
  dedupedEntries: DailyBriefNotebookEntryRecord[];
};

type SaveDailyBriefNotebookAuthoredEntryInput = {
  parentId: string;
  parentEmail: string;
  studentId: string;
  programme: Programme;
  interestTags: string[];
  briefId: string;
  scheduledFor: string;
  headline: string;
  topicTags: string[];
  knowledgeBankTitle: string;
  entryType: DailyBriefNotebookEntryType;
  body: string;
};

type SaveDailyBriefNotebookAuthoredEntryResult = {
  entry: DailyBriefNotebookEntryRecord;
  wasUpdate: boolean;
};

export type { DailyBriefNotebookEntryRecord } from "./daily-brief-notebook-schema";

function getDailyBriefNotebookStore(): DailyBriefNotebookStore {
  validateProfileStoreConfig();

  return getProfileStoreBackend() === "firestore"
    ? firestoreDailyBriefNotebookStore
    : localDailyBriefNotebookStore;
}

function normalizeString(value: string) {
  return value.trim();
}

function normalizeStringArray(values: string[]) {
  return values.map((value) => normalizeString(value)).filter(Boolean);
}

function buildNotebookDeduplicationKey(
  entry: Pick<
    DailyBriefNotebookEntryRecord,
    "parentId" | "sourceBriefId" | "entryType" | "entryOrigin"
  >,
) {
  return `${entry.parentId}::${entry.sourceBriefId}::${entry.entryType}::${entry.entryOrigin}`;
}

export async function listDailyBriefNotebookEntries(
  filters: DailyBriefNotebookFilters = {},
) {
  return getDailyBriefNotebookStore().listEntries(filters);
}

export async function saveDailyBriefNotebookEntries(
  input: SaveDailyBriefNotebookEntriesInput,
): Promise<SaveDailyBriefNotebookEntriesResult> {
  const store = getDailyBriefNotebookStore();
  const existingEntries = await store.listEntries({
    parentId: input.parentId,
  });
  const existingByKey = new Map(
    existingEntries.map((entry) => [buildNotebookDeduplicationKey(entry), entry]),
  );

  const savedEntries: DailyBriefNotebookEntryRecord[] = [];
  const dedupedEntries: DailyBriefNotebookEntryRecord[] = [];
  const timestamp = new Date().toISOString();

  for (const entry of input.entries) {
    const entryType = resolveDailyBriefNotebookEntryType(
      input.programme,
      entry.title,
    );
    const candidate: DailyBriefNotebookEntryRecord = {
      id: crypto.randomUUID(),
      parentId: normalizeString(input.parentId),
      parentEmail: normalizeString(input.parentEmail).toLowerCase(),
      studentId: normalizeString(input.studentId),
      programme: input.programme,
      entryType,
      entryOrigin: "system",
      title: normalizeString(entry.title),
      body: normalizeString(entry.body),
      knowledgeBankTitle: normalizeString(input.knowledgeBankTitle),
      sourceBriefId: normalizeString(input.briefId),
      sourceScheduledFor: normalizeString(input.scheduledFor),
      sourceHeadline: normalizeString(input.headline),
      topicTags: normalizeStringArray(input.topicTags),
      interestTags: normalizeStringArray(input.interestTags),
      savedSource: "dashboard",
      savedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const dedupeKey = buildNotebookDeduplicationKey(candidate);
    const existingEntry = existingByKey.get(dedupeKey);

    if (existingEntry) {
      dedupedEntries.push(existingEntry);
      continue;
    }

    const savedEntry = await store.createEntry(candidate);
    existingByKey.set(dedupeKey, savedEntry);
    savedEntries.push(savedEntry);
  }

  return {
    savedEntries,
    dedupedEntries,
  };
}

export async function saveDailyBriefNotebookAuthoredEntry(
  input: SaveDailyBriefNotebookAuthoredEntryInput,
): Promise<SaveDailyBriefNotebookAuthoredEntryResult> {
  if (!isAuthoredNotebookEntryTypeAllowed(input.programme, input.entryType)) {
    throw new Error("This notebook entry type is not available for the current programme.");
  }

  const store = getDailyBriefNotebookStore();
  const existingEntries = await store.listEntries({
    parentId: input.parentId,
  });
  const existingByKey = new Map(
    existingEntries.map((entry) => [buildNotebookDeduplicationKey(entry), entry]),
  );
  const timestamp = new Date().toISOString();
  const prototypeEntry: Pick<
    DailyBriefNotebookEntryRecord,
    "parentId" | "sourceBriefId" | "entryType" | "entryOrigin"
  > = {
    parentId: normalizeString(input.parentId),
    sourceBriefId: normalizeString(input.briefId),
    entryType: input.entryType,
    entryOrigin: "authored",
  };
  const existingEntry = existingByKey.get(buildNotebookDeduplicationKey(prototypeEntry));
  const nextEntry: DailyBriefNotebookEntryRecord = {
    id: existingEntry?.id ?? crypto.randomUUID(),
    parentId: normalizeString(input.parentId),
    parentEmail: normalizeString(input.parentEmail).toLowerCase(),
    studentId: normalizeString(input.studentId),
    programme: input.programme,
    entryType: input.entryType,
    entryOrigin: "authored",
    title: getDailyBriefNotebookEntryLabel(input.entryType),
    body: normalizeString(input.body),
    knowledgeBankTitle: normalizeString(input.knowledgeBankTitle),
    sourceBriefId: normalizeString(input.briefId),
    sourceScheduledFor: normalizeString(input.scheduledFor),
    sourceHeadline: normalizeString(input.headline),
    topicTags: normalizeStringArray(input.topicTags),
    interestTags: normalizeStringArray(input.interestTags),
    savedSource: "reflection",
    savedAt: existingEntry?.savedAt ?? timestamp,
    createdAt: existingEntry?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  const savedEntry = await store.upsertEntry(nextEntry);

  return {
    entry: savedEntry,
    wasUpdate: Boolean(existingEntry),
  };
}
