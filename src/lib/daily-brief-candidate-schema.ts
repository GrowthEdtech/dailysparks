import type { DailyBriefEditorialCohort } from "./daily-brief-cohorts";
import type { DailyBriefSourceReference } from "./daily-brief-history-schema";
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
  summary: string;
  sourceReferences: DailyBriefSourceReference[];
  candidateCount: number;
  selectedAt: string;
  selectedByCohort: DailyBriefEditorialCohort;
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
  createdAt: string;
  updatedAt: string;
};
