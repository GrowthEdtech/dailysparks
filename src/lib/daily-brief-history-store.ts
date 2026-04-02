import { firestoreDailyBriefHistoryStore } from "./firestore-daily-brief-history-store";
import type { DailyBriefHistoryRecord } from "./daily-brief-history-schema";
import { localDailyBriefHistoryStore } from "./local-daily-brief-history-store";
import type {
  CreateDailyBriefHistoryEntryInput,
  DailyBriefHistoryFilters,
  DailyBriefHistoryStore,
} from "./daily-brief-history-store-types";
import {
  getProfileStoreBackend,
  validateProfileStoreConfig,
} from "./profile-store-config";

function getDailyBriefHistoryStore(): DailyBriefHistoryStore {
  validateProfileStoreConfig();

  return getProfileStoreBackend() === "firestore"
    ? firestoreDailyBriefHistoryStore
    : localDailyBriefHistoryStore;
}

function sortEntries(entries: DailyBriefHistoryRecord[]) {
  return [...entries].sort((left, right) => {
    if (left.scheduledFor !== right.scheduledFor) {
      return right.scheduledFor.localeCompare(left.scheduledFor);
    }

    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

export async function listDailyBriefHistory(
  filters: DailyBriefHistoryFilters = {},
) {
  const entries = await getDailyBriefHistoryStore().listEntries();

  return sortEntries(entries).filter((entry) => {
    if (filters.programme && entry.programme !== filters.programme) {
      return false;
    }

    if (filters.status && entry.status !== filters.status) {
      return false;
    }

    return true;
  });
}

export async function getDailyBriefHistoryEntry(id: string) {
  return getDailyBriefHistoryStore().getEntry(id);
}

export async function createDailyBriefHistoryEntry(
  input: CreateDailyBriefHistoryEntryInput,
) {
  const timestamp = new Date().toISOString();
  const record: DailyBriefHistoryRecord = {
    id: crypto.randomUUID(),
    scheduledFor: input.scheduledFor,
    headline: input.headline.trim(),
    summary: input.summary.trim(),
    programme: input.programme,
    status: input.status,
    topicTags: input.topicTags.map((tag) => tag.trim()).filter(Boolean),
    sourceReferences: input.sourceReferences.map((reference) => ({
      sourceId: reference.sourceId.trim(),
      sourceName: reference.sourceName.trim(),
      sourceDomain: reference.sourceDomain.trim(),
      articleTitle: reference.articleTitle.trim(),
      articleUrl: reference.articleUrl.trim(),
    })),
    aiConnectionId: input.aiConnectionId.trim(),
    aiConnectionName: input.aiConnectionName.trim(),
    aiModel: input.aiModel.trim(),
    promptVersion: input.promptVersion.trim(),
    repetitionRisk: input.repetitionRisk,
    repetitionNotes: input.repetitionNotes.trim(),
    adminNotes: input.adminNotes.trim(),
    briefMarkdown: input.briefMarkdown.trim(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return getDailyBriefHistoryStore().createEntry(record);
}
