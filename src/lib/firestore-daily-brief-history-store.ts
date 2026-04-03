import { getFirebaseAdminDb } from "./firebase-admin";
import {
  DAILY_BRIEF_DELIVERY_CHANNELS,
  DAILY_BRIEF_PIPELINE_STAGES,
  DAILY_BRIEF_RECORD_KINDS,
  DAILY_BRIEF_REPETITION_RISKS,
  DAILY_BRIEF_STATUSES,
  type DailyBriefDeliveryChannel,
  type DailyBriefDeliveryReceipt,
  type DailyBriefFailedDeliveryTarget,
  type DailyBriefHistoryRecord,
  type DailyBriefPipelineStage,
  type DailyBriefRecordKind,
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

function normalizeRecordKind(value: unknown): DailyBriefRecordKind {
  const normalized = normalizeString(value);
  return DAILY_BRIEF_RECORD_KINDS.includes(normalized as DailyBriefRecordKind)
    ? (normalized as DailyBriefRecordKind)
    : "production";
}

function normalizeRepetitionRisk(value: unknown): DailyBriefRepetitionRisk {
  const normalized = normalizeString(value);
  return DAILY_BRIEF_REPETITION_RISKS.includes(
    normalized as DailyBriefRepetitionRisk,
  )
    ? (normalized as DailyBriefRepetitionRisk)
    : "low";
}

function normalizePipelineStage(value: unknown): DailyBriefPipelineStage {
  const normalized = normalizeString(value);
  return DAILY_BRIEF_PIPELINE_STAGES.includes(
    normalized as DailyBriefPipelineStage,
  )
    ? (normalized as DailyBriefPipelineStage)
    : "generated";
}

function normalizeNullableString(value: unknown) {
  return normalizeString(value) || null;
}

function normalizeCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeDeliveryChannel(value: unknown): DailyBriefDeliveryChannel {
  const normalized = normalizeString(value);

  return DAILY_BRIEF_DELIVERY_CHANNELS.includes(
    normalized as DailyBriefDeliveryChannel,
  )
    ? (normalized as DailyBriefDeliveryChannel)
    : "goodnotes";
}

function normalizeFailedDeliveryTarget(
  raw: Partial<DailyBriefFailedDeliveryTarget> | undefined,
): DailyBriefFailedDeliveryTarget {
  return {
    parentId: normalizeString(raw?.parentId),
    parentEmail: normalizeString(raw?.parentEmail),
    channel: normalizeDeliveryChannel(raw?.channel),
    errorMessage: normalizeString(raw?.errorMessage),
  };
}

function normalizeDeliveryReceipt(
  raw: Partial<DailyBriefDeliveryReceipt> | undefined,
): DailyBriefDeliveryReceipt {
  return {
    parentId: normalizeString(raw?.parentId),
    parentEmail: normalizeString(raw?.parentEmail),
    channel: normalizeDeliveryChannel(raw?.channel),
    attachmentFileName: normalizeNullableString(raw?.attachmentFileName),
    externalId: normalizeNullableString(raw?.externalId),
    externalUrl: normalizeNullableString(raw?.externalUrl),
  };
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
    recordKind: normalizeRecordKind(raw?.recordKind),
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
    pipelineStage: normalizePipelineStage(raw?.pipelineStage),
    candidateSnapshotAt: normalizeNullableString(raw?.candidateSnapshotAt),
    generationCompletedAt: normalizeNullableString(raw?.generationCompletedAt),
    pdfBuiltAt: normalizeNullableString(raw?.pdfBuiltAt),
    deliveryWindowAt: normalizeNullableString(raw?.deliveryWindowAt),
    lastDeliveryAttemptAt: normalizeNullableString(raw?.lastDeliveryAttemptAt),
    deliveryAttemptCount: normalizeCount(raw?.deliveryAttemptCount),
    deliverySuccessCount: normalizeCount(raw?.deliverySuccessCount),
    deliveryFailureCount: normalizeCount(raw?.deliveryFailureCount),
    deliveryReceipts: Array.isArray(raw?.deliveryReceipts)
      ? raw.deliveryReceipts.map((receipt) =>
          normalizeDeliveryReceipt(receipt),
        )
      : [],
    failedDeliveryTargets: Array.isArray(raw?.failedDeliveryTargets)
      ? raw.failedDeliveryTargets.map((target) =>
          normalizeFailedDeliveryTarget(target),
        )
      : [],
    failureReason: normalizeString(raw?.failureReason),
    retryEligibleUntil: normalizeNullableString(raw?.retryEligibleUntil),
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

  async updateEntry(id, record) {
    const collection = getFirebaseAdminDb().collection(
      "editorialDailyBriefHistory",
    );
    const document = await collection.doc(id).get();

    if (!document.exists) {
      return null;
    }

    const existingEntry = normalizeEntry(
      document.id,
      document.data() as Partial<DailyBriefHistoryRecord> | undefined,
    );
    const nextEntry = normalizeEntry(document.id, {
      ...existingEntry,
      ...record,
      createdAt: existingEntry.createdAt,
      updatedAt: new Date().toISOString(),
    });

    await collection.doc(id).set(nextEntry);

    return nextEntry;
  },
};
