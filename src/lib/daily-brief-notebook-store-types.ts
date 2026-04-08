import type {
  DailyBriefNotebookEntryRecord,
} from "./daily-brief-notebook-schema";

export type DailyBriefNotebookFilters = {
  parentId?: string;
  studentId?: string;
  programme?: DailyBriefNotebookEntryRecord["programme"];
  entryOrigin?: DailyBriefNotebookEntryRecord["entryOrigin"];
  limit?: number;
};

export type DailyBriefNotebookStore = {
  listEntries(
    filters?: DailyBriefNotebookFilters,
  ): Promise<DailyBriefNotebookEntryRecord[]>;
  createEntry(
    entry: DailyBriefNotebookEntryRecord,
  ): Promise<DailyBriefNotebookEntryRecord>;
  upsertEntry(
    entry: DailyBriefNotebookEntryRecord,
  ): Promise<DailyBriefNotebookEntryRecord>;
};
