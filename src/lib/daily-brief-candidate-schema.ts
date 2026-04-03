import type { EditorialSourceCandidate } from "./source-ingestion";

export const DAILY_BRIEF_CANDIDATE_SELECTION_STATUSES = [
  "open",
  "frozen",
] as const;

export type DailyBriefCandidateSelectionStatus =
  (typeof DAILY_BRIEF_CANDIDATE_SELECTION_STATUSES)[number];

export type DailyBriefCandidateSnapshotRecord = {
  id: string;
  scheduledFor: string;
  candidates: EditorialSourceCandidate[];
  sourceIds: string[];
  candidateCount: number;
  selectionStatus: DailyBriefCandidateSelectionStatus;
  selectionFrozenAt: string | null;
  createdAt: string;
  updatedAt: string;
};
