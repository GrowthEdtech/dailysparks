import type { DailyBriefCandidateSnapshotRecord } from "./daily-brief-candidate-schema";

export type CreateDailyBriefCandidateSnapshotInput = Omit<
  DailyBriefCandidateSnapshotRecord,
  | "id"
  | "sourceIds"
  | "candidateCount"
  | "createdAt"
  | "updatedAt"
>;

export type DailyBriefCandidateSnapshotStore = {
  listSnapshots(): Promise<DailyBriefCandidateSnapshotRecord[]>;
  getSnapshotByScheduledFor(
    scheduledFor: string,
  ): Promise<DailyBriefCandidateSnapshotRecord | null>;
  upsertSnapshot(
    record: DailyBriefCandidateSnapshotRecord,
  ): Promise<DailyBriefCandidateSnapshotRecord>;
};
