import type {
  DailyBriefNotebookEntryRecord,
} from "./daily-brief-notebook-schema";

export type DailyBriefNotebookFilters = {
  parentId?: string;
  studentId?: string;
  programme?: DailyBriefNotebookEntryRecord["programme"];
  limit?: number;
};

export type DailyBriefNotebookStore = {
  listEntries(
    filters?: DailyBriefNotebookFilters,
  ): Promise<DailyBriefNotebookEntryRecord[]>;
  createEntry(
    entry: DailyBriefNotebookEntryRecord,
  ): Promise<DailyBriefNotebookEntryRecord>;
};
