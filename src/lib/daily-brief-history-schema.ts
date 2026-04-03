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

export type DailyBriefHistoryRecord = {
  id: string;
  scheduledFor: string;
  headline: string;
  summary: string;
  programme: Programme;
  status: DailyBriefStatus;
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
  failedDeliveryTargets: DailyBriefFailedDeliveryTarget[];
  failureReason: string;
  retryEligibleUntil: string | null;
  createdAt: string;
  updatedAt: string;
};
