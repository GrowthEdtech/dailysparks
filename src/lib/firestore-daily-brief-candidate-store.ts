import { getFirebaseAdminDb } from "./firebase-admin";
import {
  DAILY_BRIEF_CANDIDATE_SELECTION_STATUSES,
  type DailyBriefCandidateSelectionStatus,
  type DailyBriefCandidateSnapshotRecord,
} from "./daily-brief-candidate-schema";
import type { DailyBriefCandidateSnapshotStore } from "./daily-brief-candidate-store-types";
import type { EditorialSourceCandidate } from "./source-ingestion";

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
  id: string,
  raw: Partial<DailyBriefCandidateSnapshotRecord> | undefined,
): DailyBriefCandidateSnapshotRecord {
  const timestamp = new Date().toISOString();
  const candidates = Array.isArray(raw?.candidates)
    ? raw.candidates.map((candidate) => normalizeCandidate(candidate))
    : [];

  return {
    id,
    scheduledFor: normalizeString(raw?.scheduledFor),
    candidates,
    sourceIds: normalizeStringArray(raw?.sourceIds),
    candidateCount:
      typeof raw?.candidateCount === "number" ? raw.candidateCount : candidates.length,
    selectionStatus: normalizeSelectionStatus(raw?.selectionStatus),
    selectionFrozenAt: normalizeString(raw?.selectionFrozenAt) || null,
    createdAt: normalizeString(raw?.createdAt) || timestamp,
    updatedAt: normalizeString(raw?.updatedAt) || timestamp,
  };
}

export const firestoreDailyBriefCandidateStore: DailyBriefCandidateSnapshotStore =
  {
    async listSnapshots() {
      const snapshot = await getFirebaseAdminDb()
        .collection("dailyBriefCandidateSnapshots")
        .get();

      return snapshot.docs.map((document) =>
        normalizeSnapshot(
          document.id,
          document.data() as Partial<DailyBriefCandidateSnapshotRecord> | undefined,
        ),
      );
    },

    async getSnapshotByScheduledFor(scheduledFor) {
      const snapshot = await getFirebaseAdminDb()
        .collection("dailyBriefCandidateSnapshots")
        .where("scheduledFor", "==", scheduledFor)
        .limit(1)
        .get();

      const document = snapshot.docs[0];

      if (!document) {
        return null;
      }

      return normalizeSnapshot(
        document.id,
        document.data() as Partial<DailyBriefCandidateSnapshotRecord> | undefined,
      );
    },

    async upsertSnapshot(record) {
      const collection = getFirebaseAdminDb().collection(
        "dailyBriefCandidateSnapshots",
      );
      const nextSnapshot = normalizeSnapshot(record.id, record);

      await collection.doc(nextSnapshot.id).set(nextSnapshot);

      return nextSnapshot;
    },
  };
