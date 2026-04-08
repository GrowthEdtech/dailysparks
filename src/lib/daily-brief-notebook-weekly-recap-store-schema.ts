import type {
  DailyBriefNotebookEntryType,
} from "./daily-brief-notebook-schema";
import type {
  DailyBriefNotebookWeeklyRecap,
} from "./daily-brief-notebook-weekly-recap";

export type DailyBriefNotebookWeeklyRecapResponseRecord = {
  id: string;
  promptEntryId: string;
  entryType: DailyBriefNotebookEntryType;
  title: string;
  prompt: string;
  sourceHeadline: string;
  response: string;
  createdAt: string;
  updatedAt: string;
};

export type DailyBriefNotebookWeeklyRecapRecord = DailyBriefNotebookWeeklyRecap & {
  id: string;
  parentId: string;
  parentEmail: string;
  studentId: string;
  retrievalResponses: DailyBriefNotebookWeeklyRecapResponseRecord[];
  notionLastSyncedAt: string | null;
  notionLastSyncPageId: string | null;
  notionLastSyncPageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};
