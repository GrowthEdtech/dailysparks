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

export type DailyBriefStatus = (typeof DAILY_BRIEF_STATUSES)[number];
export type DailyBriefRepetitionRisk =
  (typeof DAILY_BRIEF_REPETITION_RISKS)[number];

export type DailyBriefSourceReference = {
  sourceId: string;
  sourceName: string;
  sourceDomain: string;
  articleTitle: string;
  articleUrl: string;
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
  promptVersion: string;
  repetitionRisk: DailyBriefRepetitionRisk;
  repetitionNotes: string;
  adminNotes: string;
  briefMarkdown: string;
  createdAt: string;
  updatedAt: string;
};
