import type { DailyBriefEditorialCohort } from "./daily-brief-cohorts";
import type { DailyBriefDispatchMode } from "./daily-brief-delivery-policy";
import type {
  DailyBriefBlockedTopic,
  DailyBriefSelectionDecision,
} from "./daily-brief-selection-types";
import type { DailyBriefPdfRenderer } from "./goodnotes-delivery";
import type { Programme } from "./mvp-types";

export const DAILY_BRIEF_STATUSES = [
  "draft",
  "approved",
  "published",
  "failed",
] as const;

export const DAILY_BRIEF_REPETITION_RISKS = [
  "low",
  "medium",
  "high",
] as const;
export const DAILY_BRIEF_RECORD_KINDS = ["production", "test"] as const;
export const DAILY_BRIEF_PIPELINE_STAGES = [
  "ingested",
  "generated",
  "pdf_built",
  "preflight_passed",
  "delivering",
  "published",
  "failed",
] as const;

export type DailyBriefStatus = (typeof DAILY_BRIEF_STATUSES)[number];
export type DailyBriefRepetitionRisk =
  (typeof DAILY_BRIEF_REPETITION_RISKS)[number];
export type DailyBriefRecordKind = (typeof DAILY_BRIEF_RECORD_KINDS)[number];
export type DailyBriefPipelineStage =
  (typeof DAILY_BRIEF_PIPELINE_STAGES)[number];
export const DAILY_BRIEF_DELIVERY_CHANNELS = [
  "goodnotes",
  "notion",
] as const;
export type DailyBriefDeliveryChannel =
  (typeof DAILY_BRIEF_DELIVERY_CHANNELS)[number];

export type DailyBriefSourceReference = {
  sourceId: string;
  sourceName: string;
  sourceDomain: string;
  articleTitle: string;
  articleUrl: string;
};

export type DailyBriefFailedDeliveryTarget = {
  parentId: string;
  parentEmail: string;
  channel: DailyBriefDeliveryChannel;
  errorMessage: string;
};

export type DailyBriefDeliveryReceipt = {
  parentId: string;
  parentEmail: string;
  channel: DailyBriefDeliveryChannel;
  renderer: DailyBriefPdfRenderer | null;
  attachmentFileName: string | null;
  externalId: string | null;
  externalUrl: string | null;
};

export type DailyBriefDispatchAudienceProfile = {
  parentId: string;
  parentEmail: string;
  localDeliveryWindow: string;
  reason: string;
};

export type DailyBriefHistoryRecord = {
  id: string;
  scheduledFor: string;
  recordKind: DailyBriefRecordKind;
  headline: string;
  normalizedHeadline: string;
  summary: string;
  programme: Programme;
  editorialCohort: DailyBriefEditorialCohort;
  status: DailyBriefStatus;
  topicClusterKey: string;
  topicLatestPublishedAt: string | null;
  selectionDecision: DailyBriefSelectionDecision;
  selectionOverrideNote: string;
  blockedTopics: DailyBriefBlockedTopic[];
  topicTags: string[];
  sourceReferences: DailyBriefSourceReference[];
  aiConnectionId: string;
  aiConnectionName: string;
  aiModel: string;
  promptPolicyId: string;
  promptVersionLabel: string;
  promptVersion: string;
  repetitionRisk: DailyBriefRepetitionRisk;
  repetitionNotes: string;
  adminNotes: string;
  briefMarkdown: string;
  pipelineStage: DailyBriefPipelineStage;
  candidateSnapshotAt: string | null;
  generationCompletedAt: string | null;
  pdfBuiltAt: string | null;
  deliveryWindowAt: string | null;
  lastDeliveryAttemptAt: string | null;
  deliveryAttemptCount: number;
  deliverySuccessCount: number;
  deliveryFailureCount: number;
  dispatchMode?: DailyBriefDispatchMode | null;
  dispatchCanaryParentEmails?: string[];
  targetedProfiles?: DailyBriefDispatchAudienceProfile[];
  skippedProfiles?: DailyBriefDispatchAudienceProfile[];
  pendingFutureProfiles?: DailyBriefDispatchAudienceProfile[];
  heldProfiles?: DailyBriefDispatchAudienceProfile[];
  deliveryReceipts: DailyBriefDeliveryReceipt[];
  failedDeliveryTargets: DailyBriefFailedDeliveryTarget[];
  failureReason: string;
  retryEligibleUntil: string | null;
  createdAt: string;
  updatedAt: string;
};
