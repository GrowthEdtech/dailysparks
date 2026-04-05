import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  DAILY_BRIEF_DELIVERY_CHANNELS,
  DAILY_BRIEF_PIPELINE_STAGES,
  DAILY_BRIEF_RECORD_KINDS,
  DAILY_BRIEF_REPETITION_RISKS,
  DAILY_BRIEF_STATUSES,
  type DailyBriefDeliveryChannel,
  type DailyBriefDispatchAudienceProfile,
  type DailyBriefDeliveryReceipt,
  type DailyBriefFailedDeliveryTarget,
  type DailyBriefHistoryRecord,
  type DailyBriefPipelineStage,
  type DailyBriefRecordKind,
  type DailyBriefRepetitionRisk,
  type DailyBriefSourceReference,
  type DailyBriefStatus,
} from "./daily-brief-history-schema";
import type { DailyBriefEditorialCohort } from "./daily-brief-cohorts";
import {
  normalizeHeadlineForComparison,
  type DailyBriefBlockedTopic,
  type DailyBriefSelectionDecision,
} from "./daily-brief-selection-types";
import {
  DAILY_BRIEF_PDF_RENDERERS,
  type DailyBriefPdfRenderer,
} from "./goodnotes-delivery";
import type { DailyBriefHistoryStore } from "./daily-brief-history-store-types";
import { IB_PROGRAMMES, type Programme } from "./mvp-types";

type LocalDailyBriefHistoryStoreData = {
  entries: DailyBriefHistoryRecord[];
};

function getStoreFilePath() {
  return (
    process.env.DAILY_SPARKS_DAILY_BRIEF_STORE_PATH ??
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "data",
      "daily-brief-history.json",
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

function normalizeProgramme(value: unknown): Programme {
  const normalized = normalizeString(value);
  return IB_PROGRAMMES.includes(normalized as Programme)
    ? (normalized as Programme)
    : "PYP";
}

function normalizeEditorialCohort(value: unknown): DailyBriefEditorialCohort {
  const normalized = normalizeString(value);

  return normalized === "APAC" || normalized === "EMEA" || normalized === "AMER"
    ? normalized
    : "APAC";
}

function normalizeSelectionDecision(value: unknown): DailyBriefSelectionDecision {
  return value === "follow_up" ? "follow_up" : "new";
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

function normalizeReceiptRenderer(value: unknown): DailyBriefPdfRenderer | null {
  const normalized = normalizeString(value);

  return (DAILY_BRIEF_PDF_RENDERERS as readonly string[]).includes(normalized)
    ? (normalized as DailyBriefPdfRenderer)
    : null;
}

function normalizeDeliveryReceipt(
  raw: Partial<DailyBriefDeliveryReceipt> | undefined,
): DailyBriefDeliveryReceipt {
  return {
    parentId: normalizeString(raw?.parentId),
    parentEmail: normalizeString(raw?.parentEmail),
    channel: normalizeDeliveryChannel(raw?.channel),
    renderer: normalizeReceiptRenderer(raw?.renderer),
    attachmentFileName: normalizeNullableString(raw?.attachmentFileName),
    externalId: normalizeNullableString(raw?.externalId),
    externalUrl: normalizeNullableString(raw?.externalUrl),
  };
}

function normalizeDispatchAudienceProfile(
  raw: Partial<DailyBriefDispatchAudienceProfile> | undefined,
): DailyBriefDispatchAudienceProfile {
  return {
    parentId: normalizeString(raw?.parentId),
    parentEmail: normalizeString(raw?.parentEmail),
    localDeliveryWindow: normalizeString(raw?.localDeliveryWindow),
    reason: normalizeString(raw?.reason),
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

function normalizeEntry(
  raw: Partial<DailyBriefHistoryRecord> | undefined,
): DailyBriefHistoryRecord {
  const timestamp = new Date().toISOString();
  const normalizedDispatchMode = normalizeString(raw?.dispatchMode);

  return {
    id: normalizeString(raw?.id) || crypto.randomUUID(),
    scheduledFor: normalizeString(raw?.scheduledFor),
    recordKind: normalizeRecordKind(raw?.recordKind),
    headline: normalizeString(raw?.headline),
    normalizedHeadline:
      normalizeString(raw?.normalizedHeadline) ||
      normalizeHeadlineForComparison(normalizeString(raw?.headline)),
    summary: normalizeString(raw?.summary),
    programme: normalizeProgramme(raw?.programme),
    editorialCohort: normalizeEditorialCohort(raw?.editorialCohort),
    status: normalizeStatus(raw?.status),
    topicClusterKey:
      normalizeString(raw?.topicClusterKey) ||
      normalizeString(raw?.normalizedHeadline) ||
      normalizeHeadlineForComparison(normalizeString(raw?.headline)),
    topicLatestPublishedAt: normalizeNullableString(raw?.topicLatestPublishedAt),
    selectionDecision: normalizeSelectionDecision(raw?.selectionDecision),
    selectionOverrideNote: normalizeString(raw?.selectionOverrideNote),
    blockedTopics: Array.isArray(raw?.blockedTopics)
      ? raw.blockedTopics.map((topic) => normalizeBlockedTopic(topic))
      : [],
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
    dispatchMode:
      normalizedDispatchMode === "canary" || normalizedDispatchMode === "all"
        ? normalizedDispatchMode
        : null,
    dispatchCanaryParentEmails: normalizeStringArray(
      raw?.dispatchCanaryParentEmails,
    ),
    targetedProfiles: Array.isArray(raw?.targetedProfiles)
      ? raw.targetedProfiles.map((entry) =>
          normalizeDispatchAudienceProfile(entry),
        )
      : [],
    skippedProfiles: Array.isArray(raw?.skippedProfiles)
      ? raw.skippedProfiles.map((entry) =>
          normalizeDispatchAudienceProfile(entry),
        )
      : [],
    pendingFutureProfiles: Array.isArray(raw?.pendingFutureProfiles)
      ? raw.pendingFutureProfiles.map((entry) =>
          normalizeDispatchAudienceProfile(entry),
        )
      : [],
    heldProfiles: Array.isArray(raw?.heldProfiles)
      ? raw.heldProfiles.map((entry) =>
          normalizeDispatchAudienceProfile(entry),
        )
      : [],
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

async function readStore(): Promise<LocalDailyBriefHistoryStoreData> {
  const filePath = getStoreFilePath();

  try {
    const content = await readFile(filePath, "utf8");
    const parsed = JSON.parse(content) as {
      entries?: DailyBriefHistoryRecord[];
    };

    return {
      entries: Array.isArray(parsed.entries)
        ? parsed.entries.map((entry) => normalizeEntry(entry))
        : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { entries: [] };
    }

    throw error;
  }
}

async function writeStore(store: LocalDailyBriefHistoryStoreData) {
  const filePath = getStoreFilePath();

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(store, null, 2));
}

export const localDailyBriefHistoryStore: DailyBriefHistoryStore = {
  async listEntries() {
    const store = await readStore();
    return store.entries;
  },

  async getEntry(id) {
    const store = await readStore();
    return store.entries.find((entry) => entry.id === id) ?? null;
  },

  async createEntry(record) {
    const normalizedEntry = normalizeEntry(record);
    const store = await readStore();

    await writeStore({
      entries: [...store.entries, normalizedEntry],
    });

    return normalizedEntry;
  },

  async updateEntry(id, record) {
    const store = await readStore();
    const existingEntry = store.entries.find((entry) => entry.id === id);

    if (!existingEntry) {
      return null;
    }

    const nextEntry = normalizeEntry({
      ...existingEntry,
      ...record,
      id: existingEntry.id,
      createdAt: existingEntry.createdAt,
      updatedAt: new Date().toISOString(),
    });
    await writeStore({
      entries: store.entries.map((entry) => (entry.id === id ? nextEntry : entry)),
    });

    return nextEntry;
  },
};
