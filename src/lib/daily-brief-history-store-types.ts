import type { DailyBriefHistoryRecord } from "./daily-brief-history-schema";

export type CreateDailyBriefHistoryEntryInput = Omit<
  DailyBriefHistoryRecord,
  "id" | "createdAt" | "updatedAt"
>;

export type DailyBriefHistoryFilters = {
  programme?: DailyBriefHistoryRecord["programme"];
  status?: DailyBriefHistoryRecord["status"];
};

export type DailyBriefHistoryStore = {
  listEntries(): Promise<DailyBriefHistoryRecord[]>;
  getEntry(id: string): Promise<DailyBriefHistoryRecord | null>;
  createEntry(
    record: DailyBriefHistoryRecord,
  ): Promise<DailyBriefHistoryRecord>;
};
