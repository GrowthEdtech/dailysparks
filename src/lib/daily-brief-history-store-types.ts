import type { DailyBriefHistoryRecord } from "./daily-brief-history-schema";

type DailyBriefLifecycleField =
  | "pipelineStage"
  | "candidateSnapshotAt"
  | "generationCompletedAt"
  | "pdfBuiltAt"
  | "deliveryWindowAt"
  | "lastDeliveryAttemptAt"
  | "deliveryAttemptCount"
  | "deliverySuccessCount"
  | "deliveryFailureCount"
  | "deliveryReceipts"
  | "failedDeliveryTargets"
  | "failureReason"
  | "retryEligibleUntil";

export type CreateDailyBriefHistoryEntryInput = Omit<
  DailyBriefHistoryRecord,
  "id" | "createdAt" | "updatedAt" | DailyBriefLifecycleField
> &
  Partial<Pick<DailyBriefHistoryRecord, DailyBriefLifecycleField>>;

export type UpdateDailyBriefHistoryEntryInput = Partial<
  Omit<DailyBriefHistoryRecord, "id" | "createdAt" | "updatedAt">
>;

export type DailyBriefHistoryFilters = {
  programme?: DailyBriefHistoryRecord["programme"];
  editorialCohort?: DailyBriefHistoryRecord["editorialCohort"];
  recordKind?: DailyBriefHistoryRecord["recordKind"];
  status?: DailyBriefHistoryRecord["status"];
  scheduledFor?: DailyBriefHistoryRecord["scheduledFor"];
};

export type DailyBriefHistoryStore = {
  listEntries(): Promise<DailyBriefHistoryRecord[]>;
  getEntry(id: string): Promise<DailyBriefHistoryRecord | null>;
  createEntry(
    record: DailyBriefHistoryRecord,
  ): Promise<DailyBriefHistoryRecord>;
  updateEntry(
    id: string,
    record: Partial<Omit<DailyBriefHistoryRecord, "id" | "createdAt" | "updatedAt">>,
  ): Promise<DailyBriefHistoryRecord | null>;
};
