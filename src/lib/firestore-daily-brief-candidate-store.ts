import { getFirebaseAdminDb } from "./firebase-admin";
import {
  DAILY_BRIEF_CANDIDATE_SELECTION_STATUSES,
  type DailyBriefCandidateSelectionStatus,
  type DailyBriefCandidateSnapshotRecord,
  type DailyBriefSelectedTopicRecord,
} from "./daily-brief-candidate-schema";
import type { DailyBriefEditorialCohort } from "./daily-brief-cohorts";
import type {
  DailyBriefBlockedTopic,
  DailyBriefSelectionDecision,
} from "./daily-brief-selection-types";
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

function normalizeEditorialCohort(
  value: unknown,
): DailyBriefEditorialCohort {
  return value === "APAC" || value === "EMEA" || value === "AMER"
    ? value
    : "APAC";
}

function normalizeSelectionDecision(value: unknown): DailyBriefSelectionDecision {
  return value === "follow_up" ? "follow_up" : "new";
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
    selectedTopic: normalizeSelectedTopic(raw?.selectedTopic),
    blockedTopics: Array.isArray(raw?.blockedTopics)
      ? raw.blockedTopics.map((topic) => normalizeBlockedTopic(topic))
      : [],
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
    normalizedHeadline: normalizeString(raw.normalizedHeadline),
    summary: normalizeString(raw.summary),
    sourceReferences,
    candidateCount:
      typeof raw.candidateCount === "number"
        ? raw.candidateCount
        : sourceReferences.length,
    latestPublishedAt: normalizeString(raw.latestPublishedAt) || null,
    selectedAt: normalizeString(raw.selectedAt),
    selectedByCohort: normalizeEditorialCohort(raw.selectedByCohort),
    selectionDecision: normalizeSelectionDecision(raw.selectionDecision),
    selectionOverrideNote: normalizeString(raw.selectionOverrideNote),
  } satisfies DailyBriefSelectedTopicRecord;
}

function normalizeBlockedTopic(
  raw: Partial<DailyBriefBlockedTopic> | undefined,
): DailyBriefBlockedTopic {
  return {
    clusterKey: normalizeString(raw?.clusterKey),
    headline: normalizeString(raw?.headline),
    policy:
      raw?.policy === "exact_headline" ||
      raw?.policy === "normalized_headline" ||
      raw?.policy === "topic_cluster_cooldown"
        ? raw.policy
        : "topic_cluster_cooldown",
    reason: normalizeString(raw?.reason),
    existingScheduledFor: normalizeString(raw?.existingScheduledFor),
    existingEditorialCohort: normalizeEditorialCohort(
      raw?.existingEditorialCohort,
    ),
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
