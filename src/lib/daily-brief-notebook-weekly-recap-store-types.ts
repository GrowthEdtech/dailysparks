import type {
  DailyBriefNotebookWeeklyRecapRecord,
} from "./daily-brief-notebook-weekly-recap-store-schema";

export type DailyBriefNotebookWeeklyRecapFilters = {
  parentId?: string;
  studentId?: string;
  programme?: DailyBriefNotebookWeeklyRecapRecord["programme"];
  weekKey?: string;
  limit?: number;
};

export type DailyBriefNotebookWeeklyRecapStore = {
  listRecaps(
    filters?: DailyBriefNotebookWeeklyRecapFilters,
  ): Promise<DailyBriefNotebookWeeklyRecapRecord[]>;
  upsertRecap(
    record: DailyBriefNotebookWeeklyRecapRecord,
  ): Promise<DailyBriefNotebookWeeklyRecapRecord>;
};
