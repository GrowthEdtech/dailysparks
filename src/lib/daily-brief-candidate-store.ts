import type {
  DailyBriefCandidateSelectionStatus,
  DailyBriefCandidateSnapshotRecord,
  DailyBriefSelectedTopicRecord,
} from "./daily-brief-candidate-schema";
import type { DailyBriefBlockedTopic } from "./daily-brief-selection-types";
import type {
  CreateDailyBriefCandidateSnapshotInput,
  DailyBriefCandidateSnapshotStore,
} from "./daily-brief-candidate-store-types";
import { firestoreDailyBriefCandidateStore } from "./firestore-daily-brief-candidate-store";
import { localDailyBriefCandidateStore } from "./local-daily-brief-candidate-store";
import {
  getProfileStoreBackend,
  validateProfileStoreConfig,
} from "./profile-store-config";

function getDailyBriefCandidateSnapshotStore(): DailyBriefCandidateSnapshotStore {
  validateProfileStoreConfig();

  return getProfileStoreBackend() === "firestore"
    ? firestoreDailyBriefCandidateStore
    : localDailyBriefCandidateStore;
}

function sortSnapshots(snapshots: DailyBriefCandidateSnapshotRecord[]) {
  return [...snapshots].sort((left, right) => {
    if (left.scheduledFor !== right.scheduledFor) {
      return right.scheduledFor.localeCompare(left.scheduledFor);
    }

    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

function normalizeSelectionStatus(
  value: DailyBriefCandidateSelectionStatus | undefined,
): DailyBriefCandidateSelectionStatus {
  return value ?? "open";
}

function buildSourceIds(record: CreateDailyBriefCandidateSnapshotInput) {
  return Array.from(
    new Set(
      record.candidates
        .map((candidate) => candidate.sourceId.trim())
        .filter(Boolean),
    ),
  );
}

function cloneSelectedTopic(
  value: DailyBriefSelectedTopicRecord | null | undefined,
) {
  if (!value) {
    return null;
  }

  return {
    ...value,
    sourceReferences: value.sourceReferences.map((reference) => ({ ...reference })),
  } satisfies DailyBriefSelectedTopicRecord;
}

function cloneBlockedTopics(value: DailyBriefBlockedTopic[] | undefined) {
  return value?.map((topic) => ({ ...topic })) ?? [];
}

export async function listDailyBriefCandidateSnapshots() {
  const snapshots = await getDailyBriefCandidateSnapshotStore().listSnapshots();

  return sortSnapshots(snapshots);
}

export async function getDailyBriefCandidateSnapshot(scheduledFor: string) {
  return getDailyBriefCandidateSnapshotStore().getSnapshotByScheduledFor(
    scheduledFor,
  );
}

export async function upsertDailyBriefCandidateSnapshot(
  input: CreateDailyBriefCandidateSnapshotInput,
) {
  const existingSnapshot = await getDailyBriefCandidateSnapshotStore().getSnapshotByScheduledFor(
    input.scheduledFor,
  );
  const timestamp = new Date().toISOString();
  const snapshot: DailyBriefCandidateSnapshotRecord = {
    id: existingSnapshot?.id ?? crypto.randomUUID(),
    scheduledFor: input.scheduledFor,
    candidates: input.candidates.map((candidate) => ({ ...candidate })),
    sourceIds: buildSourceIds(input),
    candidateCount: input.candidates.length,
    selectionStatus: normalizeSelectionStatus(input.selectionStatus),
    selectionFrozenAt: input.selectionFrozenAt ?? null,
    selectedTopic: cloneSelectedTopic(
      input.selectedTopic ?? existingSnapshot?.selectedTopic,
    ),
    blockedTopics: cloneBlockedTopics(
      input.blockedTopics ?? existingSnapshot?.blockedTopics,
    ),
    createdAt: existingSnapshot?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  return getDailyBriefCandidateSnapshotStore().upsertSnapshot(snapshot);
}
