import { getFirebaseAdminDb } from "./firebase-admin";
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
  id: string,
  raw: Partial<DailyBriefHistoryRecord> | undefined,
): DailyBriefHistoryRecord {
  const timestamp = new Date().toISOString();

  return {
    id,
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
    promptPolicyId: normalizeString(raw?.promptPolicyId),
    promptVersionLabel: normalizeString(raw?.promptVersionLabel),
    promptVersion: normalizeString(raw?.promptVersion),
    repetitionRisk: normalizeRepetitionRisk(raw?.repetitionRisk),
    repetitionNotes: normalizeString(raw?.repetitionNotes),
    adminNotes: normalizeString(raw?.adminNotes),
    briefMarkdown: normalizeString(raw?.briefMarkdown),
    createdAt: normalizeString(raw?.createdAt) || timestamp,
    updatedAt: normalizeString(raw?.updatedAt) || timestamp,
  };
}

export const firestoreDailyBriefHistoryStore: DailyBriefHistoryStore = {
  async listEntries() {
    const snapshot = await getFirebaseAdminDb()
      .collection("editorialDailyBriefHistory")
      .get();

    return snapshot.docs.map((document) =>
      normalizeEntry(
        document.id,
        document.data() as Partial<DailyBriefHistoryRecord> | undefined,
      ),
    );
  },

  async getEntry(id) {
    const document = await getFirebaseAdminDb()
      .collection("editorialDailyBriefHistory")
      .doc(id)
      .get();

    if (!document.exists) {
      return null;
    }

    return normalizeEntry(
      document.id,
      document.data() as Partial<DailyBriefHistoryRecord> | undefined,
    );
  },

  async createEntry(record) {
    const nextEntry = normalizeEntry(record.id, record);

    await getFirebaseAdminDb()
      .collection("editorialDailyBriefHistory")
      .doc(nextEntry.id)
      .set(nextEntry);

    return nextEntry;
  },
};
