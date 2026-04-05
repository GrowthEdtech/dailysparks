import { firestoreDailyBriefHistoryStore } from "./firestore-daily-brief-history-store";
import type { DailyBriefEditorialCohort } from "./daily-brief-cohorts";
import type {
  DailyBriefRenderAudit,
  DailyBriefDispatchAudienceProfile,
  DailyBriefHistoryRecord,
} from "./daily-brief-history-schema";
import {
  DAILY_BRIEF_PDF_RENDERERS,
  type DailyBriefPdfRenderer,
} from "./goodnotes-delivery";
import { normalizeHeadlineForComparison } from "./daily-brief-selection-types";
import { localDailyBriefHistoryStore } from "./local-daily-brief-history-store";
import type {
  CreateDailyBriefHistoryEntryInput,
  DailyBriefHistoryFilters,
  DailyBriefHistoryStore,
  UpdateDailyBriefHistoryEntryInput,
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

function defaultPipelineStageForStatus(
  status: DailyBriefHistoryRecord["status"],
): DailyBriefHistoryRecord["pipelineStage"] {
  if (status === "published") {
    return "published";
  }

  if (status === "failed") {
    return "failed";
  }

  if (status === "approved") {
    return "preflight_passed";
  }

  return "generated";
}

function defaultRecordKind(
  recordKind: DailyBriefHistoryRecord["recordKind"] | undefined,
) {
  return recordKind ?? "production";
}

function defaultEditorialCohort(
  editorialCohort: DailyBriefEditorialCohort | undefined,
) {
  return editorialCohort ?? "APAC";
}

function normalizeDispatchAudienceProfiles(
  entries: DailyBriefDispatchAudienceProfile[] | undefined,
) {
  return (
    entries?.map((entry) => ({
      parentId: entry.parentId.trim(),
      parentEmail: entry.parentEmail.trim(),
      localDeliveryWindow: entry.localDeliveryWindow.trim(),
      reason: entry.reason.trim(),
    })) ?? []
  );
}

function normalizeReceiptRenderer(value: unknown): DailyBriefPdfRenderer | null {
  return typeof value === "string" &&
      (DAILY_BRIEF_PDF_RENDERERS as readonly string[]).includes(value)
    ? (value as DailyBriefPdfRenderer)
    : null;
}

function normalizeRenderAudit(
  value: DailyBriefRenderAudit | null | undefined,
): DailyBriefRenderAudit | null {
  if (!value) {
    return null;
  }

  return {
    renderer: normalizeReceiptRenderer(value.renderer) ?? "pdf-lib",
    layoutVariant:
      value.layoutVariant === "pyp-one-page" ? "pyp-one-page" : "standard",
    pageCount:
      typeof value.pageCount === "number" && Number.isFinite(value.pageCount)
        ? value.pageCount
        : 0,
    onePageCompliant:
      typeof value.onePageCompliant === "boolean" ? value.onePageCompliant : null,
    auditedAt: value.auditedAt.trim(),
  };
}

export async function listDailyBriefHistory(
  filters: DailyBriefHistoryFilters = {},
) {
  const entries = await getDailyBriefHistoryStore().listEntries();

  return sortEntries(entries).filter((entry) => {
    if (filters.scheduledFor && entry.scheduledFor !== filters.scheduledFor) {
      return false;
    }

    if (filters.programme && entry.programme !== filters.programme) {
      return false;
    }

    if (
      filters.editorialCohort &&
      entry.editorialCohort !== filters.editorialCohort
    ) {
      return false;
    }

    if (filters.recordKind && entry.recordKind !== filters.recordKind) {
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
  const normalizedHeadline = normalizeHeadlineForComparison(input.headline);
  const record: DailyBriefHistoryRecord = {
    id: crypto.randomUUID(),
    scheduledFor: input.scheduledFor,
    recordKind: defaultRecordKind(input.recordKind),
    headline: input.headline.trim(),
    normalizedHeadline,
    summary: input.summary.trim(),
    programme: input.programme,
    editorialCohort: defaultEditorialCohort(input.editorialCohort),
    status: input.status,
    topicClusterKey: input.topicClusterKey?.trim() || normalizedHeadline,
    topicLatestPublishedAt: input.topicLatestPublishedAt?.trim() || null,
    selectionDecision: input.selectionDecision ?? "new",
    selectionOverrideNote: input.selectionOverrideNote?.trim() || "",
    blockedTopics:
      input.blockedTopics?.map((topic) => ({
        clusterKey: topic.clusterKey.trim(),
        headline: topic.headline.trim(),
        policy: topic.policy,
        reason: topic.reason.trim(),
        existingScheduledFor: topic.existingScheduledFor.trim(),
        existingEditorialCohort: topic.existingEditorialCohort,
      })) ?? [],
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
    promptPolicyId: input.promptPolicyId.trim(),
    promptVersionLabel: input.promptVersionLabel.trim(),
    promptVersion: input.promptVersion.trim(),
    repetitionRisk: input.repetitionRisk,
    repetitionNotes: input.repetitionNotes.trim(),
    adminNotes: input.adminNotes.trim(),
    briefMarkdown: input.briefMarkdown.trim(),
    pipelineStage:
      input.pipelineStage ?? defaultPipelineStageForStatus(input.status),
    candidateSnapshotAt: input.candidateSnapshotAt?.trim() || null,
    generationCompletedAt: input.generationCompletedAt?.trim() || null,
    pdfBuiltAt: input.pdfBuiltAt?.trim() || null,
    deliveryWindowAt: input.deliveryWindowAt?.trim() || null,
    lastDeliveryAttemptAt: input.lastDeliveryAttemptAt?.trim() || null,
    deliveryAttemptCount: input.deliveryAttemptCount ?? 0,
    deliverySuccessCount: input.deliverySuccessCount ?? 0,
    deliveryFailureCount: input.deliveryFailureCount ?? 0,
    dispatchMode: input.dispatchMode ?? null,
    dispatchCanaryParentEmails:
      input.dispatchCanaryParentEmails?.map((value) => value.trim()).filter(Boolean) ??
      [],
    targetedProfiles: normalizeDispatchAudienceProfiles(input.targetedProfiles),
    skippedProfiles: normalizeDispatchAudienceProfiles(input.skippedProfiles),
    pendingFutureProfiles: normalizeDispatchAudienceProfiles(
      input.pendingFutureProfiles,
    ),
    heldProfiles: normalizeDispatchAudienceProfiles(input.heldProfiles),
    renderAudit: normalizeRenderAudit(input.renderAudit),
    deliveryReceipts:
      input.deliveryReceipts?.map((receipt) => ({
        parentId: receipt.parentId.trim(),
        parentEmail: receipt.parentEmail.trim(),
        channel: receipt.channel,
        renderer: normalizeReceiptRenderer(receipt.renderer),
        attachmentFileName: receipt.attachmentFileName?.trim() || null,
        externalId: receipt.externalId?.trim() || null,
        externalUrl: receipt.externalUrl?.trim() || null,
      })) ?? [],
    failedDeliveryTargets:
      input.failedDeliveryTargets?.map((target) => ({
        parentId: target.parentId.trim(),
        parentEmail: target.parentEmail.trim(),
        channel: target.channel,
        errorMessage: target.errorMessage.trim(),
      })) ?? [],
    failureReason: input.failureReason?.trim() || "",
    retryEligibleUntil: input.retryEligibleUntil?.trim() || null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return getDailyBriefHistoryStore().createEntry(record);
}

export async function updateDailyBriefHistoryEntry(
  id: string,
  input: UpdateDailyBriefHistoryEntryInput,
) {
  const nextInput: UpdateDailyBriefHistoryEntryInput = {};

  if ("scheduledFor" in input) {
    nextInput.scheduledFor = input.scheduledFor?.trim() ?? "";
  }

  if ("headline" in input) {
    nextInput.headline = input.headline?.trim() ?? "";
    nextInput.normalizedHeadline = normalizeHeadlineForComparison(
      input.headline?.trim() ?? "",
    );
  }

  if ("recordKind" in input) {
    nextInput.recordKind = defaultRecordKind(input.recordKind);
  }

  if ("summary" in input) {
    nextInput.summary = input.summary?.trim() ?? "";
  }

  if ("programme" in input) {
    nextInput.programme = input.programme;
  }

  if ("editorialCohort" in input) {
    nextInput.editorialCohort = defaultEditorialCohort(input.editorialCohort);
  }

  if ("status" in input) {
    nextInput.status = input.status;
  }

  if ("topicClusterKey" in input) {
    nextInput.topicClusterKey = input.topicClusterKey?.trim() ?? "";
  }

  if ("topicLatestPublishedAt" in input) {
    nextInput.topicLatestPublishedAt = input.topicLatestPublishedAt?.trim() ?? null;
  }

  if ("selectionDecision" in input) {
    nextInput.selectionDecision = input.selectionDecision;
  }

  if ("selectionOverrideNote" in input) {
    nextInput.selectionOverrideNote = input.selectionOverrideNote?.trim() ?? "";
  }

  if ("blockedTopics" in input) {
    nextInput.blockedTopics =
      input.blockedTopics?.map((topic) => ({
        clusterKey: topic.clusterKey.trim(),
        headline: topic.headline.trim(),
        policy: topic.policy,
        reason: topic.reason.trim(),
        existingScheduledFor: topic.existingScheduledFor.trim(),
        existingEditorialCohort: topic.existingEditorialCohort,
      })) ?? [];
  }

  if ("topicTags" in input) {
    nextInput.topicTags = input.topicTags?.map((tag) => tag.trim()).filter(Boolean) ?? [];
  }

  if ("sourceReferences" in input) {
    nextInput.sourceReferences =
      input.sourceReferences?.map((reference) => ({
        sourceId: reference.sourceId.trim(),
        sourceName: reference.sourceName.trim(),
        sourceDomain: reference.sourceDomain.trim(),
        articleTitle: reference.articleTitle.trim(),
        articleUrl: reference.articleUrl.trim(),
      })) ?? [];
  }

  if ("aiConnectionId" in input) {
    nextInput.aiConnectionId = input.aiConnectionId?.trim() ?? "";
  }

  if ("aiConnectionName" in input) {
    nextInput.aiConnectionName = input.aiConnectionName?.trim() ?? "";
  }

  if ("aiModel" in input) {
    nextInput.aiModel = input.aiModel?.trim() ?? "";
  }

  if ("promptPolicyId" in input) {
    nextInput.promptPolicyId = input.promptPolicyId?.trim() ?? "";
  }

  if ("promptVersionLabel" in input) {
    nextInput.promptVersionLabel = input.promptVersionLabel?.trim() ?? "";
  }

  if ("promptVersion" in input) {
    nextInput.promptVersion = input.promptVersion?.trim() ?? "";
  }

  if ("repetitionRisk" in input) {
    nextInput.repetitionRisk = input.repetitionRisk;
  }

  if ("repetitionNotes" in input) {
    nextInput.repetitionNotes = input.repetitionNotes?.trim() ?? "";
  }

  if ("adminNotes" in input) {
    nextInput.adminNotes = input.adminNotes?.trim() ?? "";
  }

  if ("briefMarkdown" in input) {
    nextInput.briefMarkdown = input.briefMarkdown?.trim() ?? "";
  }

  if ("pipelineStage" in input) {
    nextInput.pipelineStage = input.pipelineStage;
  }

  if ("candidateSnapshotAt" in input) {
    nextInput.candidateSnapshotAt = input.candidateSnapshotAt?.trim() ?? null;
  }

  if ("generationCompletedAt" in input) {
    nextInput.generationCompletedAt = input.generationCompletedAt?.trim() ?? null;
  }

  if ("pdfBuiltAt" in input) {
    nextInput.pdfBuiltAt = input.pdfBuiltAt?.trim() ?? null;
  }

  if ("deliveryWindowAt" in input) {
    nextInput.deliveryWindowAt = input.deliveryWindowAt?.trim() ?? null;
  }

  if ("lastDeliveryAttemptAt" in input) {
    nextInput.lastDeliveryAttemptAt = input.lastDeliveryAttemptAt?.trim() ?? null;
  }

  if ("deliveryAttemptCount" in input) {
    nextInput.deliveryAttemptCount = input.deliveryAttemptCount;
  }

  if ("deliverySuccessCount" in input) {
    nextInput.deliverySuccessCount = input.deliverySuccessCount;
  }

  if ("deliveryFailureCount" in input) {
    nextInput.deliveryFailureCount = input.deliveryFailureCount;
  }

  if ("dispatchMode" in input) {
    nextInput.dispatchMode = input.dispatchMode ?? null;
  }

  if ("dispatchCanaryParentEmails" in input) {
    nextInput.dispatchCanaryParentEmails =
      input.dispatchCanaryParentEmails?.map((value) => value.trim()).filter(Boolean) ??
      [];
  }

  if ("targetedProfiles" in input) {
    nextInput.targetedProfiles = normalizeDispatchAudienceProfiles(
      input.targetedProfiles,
    );
  }

  if ("skippedProfiles" in input) {
    nextInput.skippedProfiles = normalizeDispatchAudienceProfiles(
      input.skippedProfiles,
    );
  }

  if ("pendingFutureProfiles" in input) {
    nextInput.pendingFutureProfiles = normalizeDispatchAudienceProfiles(
      input.pendingFutureProfiles,
    );
  }

  if ("heldProfiles" in input) {
    nextInput.heldProfiles = normalizeDispatchAudienceProfiles(input.heldProfiles);
  }

  if ("renderAudit" in input) {
    nextInput.renderAudit = normalizeRenderAudit(input.renderAudit);
  }

  if ("deliveryReceipts" in input) {
    nextInput.deliveryReceipts =
      input.deliveryReceipts?.map((receipt) => ({
        parentId: receipt.parentId.trim(),
        parentEmail: receipt.parentEmail.trim(),
        channel: receipt.channel,
        renderer: normalizeReceiptRenderer(receipt.renderer),
        attachmentFileName: receipt.attachmentFileName?.trim() || null,
        externalId: receipt.externalId?.trim() || null,
        externalUrl: receipt.externalUrl?.trim() || null,
      })) ?? [];
  }

  if ("failedDeliveryTargets" in input) {
    nextInput.failedDeliveryTargets =
      input.failedDeliveryTargets?.map((target) => ({
        parentId: target.parentId.trim(),
        parentEmail: target.parentEmail.trim(),
        channel: target.channel,
        errorMessage: target.errorMessage.trim(),
      })) ?? [];
  }

  if ("failureReason" in input) {
    nextInput.failureReason = input.failureReason?.trim() ?? "";
  }

  if ("retryEligibleUntil" in input) {
    nextInput.retryEligibleUntil = input.retryEligibleUntil?.trim() ?? null;
  }

  return getDailyBriefHistoryStore().updateEntry(id, nextInput);
}
