import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  DAILY_BRIEF_CANDIDATE_SELECTION_STATUSES,
  type DailyBriefCandidateSelectionStatus,
  type DailyBriefCandidateSnapshotRecord,
  type DailyBriefSelectedTopicRecord,
} from "./daily-brief-candidate-schema";
import type { DailyBriefEditorialCohort } from "./daily-brief-cohorts";
import type { DailyBriefCandidateSnapshotStore } from "./daily-brief-candidate-store-types";
import type { EditorialSourceCandidate } from "./source-ingestion";

type LocalDailyBriefCandidateStoreData = {
  snapshots: DailyBriefCandidateSnapshotRecord[];
};

function getStoreFilePath() {
  return (
    process.env.DAILY_SPARKS_DAILY_BRIEF_CANDIDATE_STORE_PATH ??
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "data",
      "daily-brief-candidate-snapshots.json",
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

function normalizeSelectionStatus(
  value: unknown,
): DailyBriefCandidateSelectionStatus {
  const normalized = normalizeString(value);

  return DAILY_BRIEF_CANDIDATE_SELECTION_STATUSES.includes(
    normalized as DailyBriefCandidateSelectionStatus,
  )
    ? (normalized as DailyBriefCandidateSelectionStatus)
    : "open";
}

function normalizeEditorialCohort(
  value: unknown,
): DailyBriefEditorialCohort {
  return value === "APAC" || value === "EMEA" || value === "AMER"
    ? value
    : "APAC";
}

function normalizeCandidate(
  raw: Partial<EditorialSourceCandidate> | undefined,
): EditorialSourceCandidate {
  return {
    id: normalizeString(raw?.id) || crypto.randomUUID(),
    sourceId: normalizeString(raw?.sourceId),
    sourceName: normalizeString(raw?.sourceName),
    sourceDomain: normalizeString(raw?.sourceDomain),
    feedUrl: normalizeString(raw?.feedUrl),
    section: normalizeString(raw?.section),
    title: normalizeString(raw?.title),
    summary: normalizeString(raw?.summary),
    url: normalizeString(raw?.url),
    normalizedUrl: normalizeString(raw?.normalizedUrl),
    normalizedTitle: normalizeString(raw?.normalizedTitle),
    publishedAt: normalizeString(raw?.publishedAt) || null,
    ingestionMode:
      raw?.ingestionMode === "summary-link" ? "summary-link" : "metadata-only",
    fetchedAt: normalizeString(raw?.fetchedAt),
  };
}

function normalizeSnapshot(
  raw: Partial<DailyBriefCandidateSnapshotRecord> | undefined,
): DailyBriefCandidateSnapshotRecord {
  const timestamp = new Date().toISOString();
  const candidates = Array.isArray(raw?.candidates)
    ? raw.candidates.map((candidate) => normalizeCandidate(candidate))
    : [];

  return {
    id: normalizeString(raw?.id) || crypto.randomUUID(),
    scheduledFor: normalizeString(raw?.scheduledFor),
    candidates,
    sourceIds: normalizeStringArray(raw?.sourceIds),
    candidateCount:
      typeof raw?.candidateCount === "number" ? raw.candidateCount : candidates.length,
    selectionStatus: normalizeSelectionStatus(raw?.selectionStatus),
    selectionFrozenAt: normalizeString(raw?.selectionFrozenAt) || null,
    selectedTopic: normalizeSelectedTopic(raw?.selectedTopic),
    createdAt: normalizeString(raw?.createdAt) || timestamp,
    updatedAt: normalizeString(raw?.updatedAt) || timestamp,
  };
}

function normalizeSelectedTopic(
  raw: Partial<DailyBriefSelectedTopicRecord> | null | undefined,
) {
  if (!raw) {
    return null;
  }

  const sourceReferences = Array.isArray(raw.sourceReferences)
    ? raw.sourceReferences.map((reference) => ({
        sourceId: normalizeString(reference?.sourceId),
        sourceName: normalizeString(reference?.sourceName),
        sourceDomain: normalizeString(reference?.sourceDomain),
        articleTitle: normalizeString(reference?.articleTitle),
        articleUrl: normalizeString(reference?.articleUrl),
      }))
    : [];

  return {
    clusterKey: normalizeString(raw.clusterKey),
    headline: normalizeString(raw.headline),
    summary: normalizeString(raw.summary),
    sourceReferences,
    candidateCount:
      typeof raw.candidateCount === "number"
        ? raw.candidateCount
        : sourceReferences.length,
    selectedAt: normalizeString(raw.selectedAt),
    selectedByCohort: normalizeEditorialCohort(raw.selectedByCohort),
  } satisfies DailyBriefSelectedTopicRecord;
}

async function readStore(): Promise<LocalDailyBriefCandidateStoreData> {
  const filePath = getStoreFilePath();

  try {
    const content = await readFile(filePath, "utf8");
    const parsed = JSON.parse(content) as {
      snapshots?: DailyBriefCandidateSnapshotRecord[];
    };

    return {
      snapshots: Array.isArray(parsed.snapshots)
        ? parsed.snapshots.map((snapshot) => normalizeSnapshot(snapshot))
        : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { snapshots: [] };
    }

    throw error;
  }
}

async function writeStore(store: LocalDailyBriefCandidateStoreData) {
  const filePath = getStoreFilePath();

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(store, null, 2));
}

export const localDailyBriefCandidateStore: DailyBriefCandidateSnapshotStore = {
  async listSnapshots() {
    const store = await readStore();

    return store.snapshots;
  },

  async getSnapshotByScheduledFor(scheduledFor) {
    const store = await readStore();

    return (
      store.snapshots.find((snapshot) => snapshot.scheduledFor === scheduledFor) ??
      null
    );
  },

  async upsertSnapshot(record) {
    const normalizedSnapshot = normalizeSnapshot(record);
    const store = await readStore();
    const snapshotIndex = store.snapshots.findIndex(
      (snapshot) => snapshot.scheduledFor === normalizedSnapshot.scheduledFor,
    );
    const snapshots = [...store.snapshots];

    if (snapshotIndex >= 0) {
      snapshots[snapshotIndex] = normalizedSnapshot;
    } else {
      snapshots.push(normalizedSnapshot);
    }

    await writeStore({ snapshots });

    return normalizedSnapshot;
  },
};
