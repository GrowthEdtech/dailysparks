import type { DailyBriefNotebookEntryRecord } from "./daily-brief-notebook-store";
import type { DailyBriefNotebookWeeklyRecapRecord } from "./daily-brief-notebook-weekly-recap-store";

export type DashboardNotebookSuggestion = {
  briefId: string;
  scheduledFor: string;
  headline: string;
  knowledgeBankTitle: string;
  entries: Array<{
    title: string;
    body: string;
  }>;
};

export type DashboardNotebookData = {
  notebookItems: DailyBriefNotebookEntryRecord[];
  weeklyRecapRecord: DailyBriefNotebookWeeklyRecapRecord | null;
  weeklyRecapHistory: DailyBriefNotebookWeeklyRecapRecord[];
  notebookSuggestion: DashboardNotebookSuggestion | null;
};
