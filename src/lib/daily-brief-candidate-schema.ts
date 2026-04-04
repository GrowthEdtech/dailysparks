import type { DailyBriefEditorialCohort } from "./daily-brief-cohorts";
import type { DailyBriefSourceReference } from "./daily-brief-history-schema";
import type {
  DailyBriefBlockedTopic,
  DailyBriefSelectionDecision,
} from "./daily-brief-selection-types";
import type { EditorialSourceCandidate } from "./source-ingestion";

export const DAILY_BRIEF_CANDIDATE_SELECTION_STATUSES = [
  "open",
  "frozen",
] as const;

export type DailyBriefCandidateSelectionStatus =
  (typeof DAILY_BRIEF_CANDIDATE_SELECTION_STATUSES)[number];

export type DailyBriefSelectedTopicRecord = {
  clusterKey: string;
  headline: string;
  normalizedHeadline: string;
  summary: string;
  sourceReferences: DailyBriefSourceReference[];
  candidateCount: number;
  latestPublishedAt: string | null;
  selectedAt: string;
  selectedByCohort: DailyBriefEditorialCohort;
  selectionDecision: DailyBriefSelectionDecision;
  selectionOverrideNote: string;
};

export type DailyBriefCandidateSnapshotRecord = {
  id: string;
  scheduledFor: string;
  candidates: EditorialSourceCandidate[];
  sourceIds: string[];
  candidateCount: number;
  selectionStatus: DailyBriefCandidateSelectionStatus;
  selectionFrozenAt: string | null;
  selectedTopic: DailyBriefSelectedTopicRecord | null;
  blockedTopics: DailyBriefBlockedTopic[];
  createdAt: string;
  updatedAt: string;
};
