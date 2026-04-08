import type { Programme } from "./mvp-types";

export const DAILY_BRIEF_NOTEBOOK_ENTRY_TYPES = [
  "inquiry-notebook",
  "global-context-note",
  "compare-connect-note",
  "vocabulary",
  "claim",
  "counterpoint",
  "tok-prompt",
  "notebook-capture",
  "generic-note",
] as const;

export type DailyBriefNotebookEntryType =
  (typeof DAILY_BRIEF_NOTEBOOK_ENTRY_TYPES)[number];

export type DailyBriefNotebookEntryRecord = {
  id: string;
  parentId: string;
  parentEmail: string;
  studentId: string;
  programme: Programme;
  entryType: DailyBriefNotebookEntryType;
  title: string;
  body: string;
  knowledgeBankTitle: string;
  sourceBriefId: string;
  sourceScheduledFor: string;
  sourceHeadline: string;
  topicTags: string[];
  interestTags: string[];
  savedSource: "dashboard";
  savedAt: string;
  createdAt: string;
};

export function resolveDailyBriefNotebookEntryType(
  programme: Programme,
  title: string,
): DailyBriefNotebookEntryType {
  const normalizedTitle = title.trim().toLowerCase();

  if (programme === "MYP") {
    if (normalizedTitle === "inquiry notebook") {
      return "inquiry-notebook";
    }

    if (normalizedTitle === "global context note") {
      return "global-context-note";
    }

    if (normalizedTitle === "compare-connect note") {
      return "compare-connect-note";
    }

    if (normalizedTitle === "vocabulary") {
      return "vocabulary";
    }
  }

  if (programme === "DP") {
    if (normalizedTitle === "claim") {
      return "claim";
    }

    if (normalizedTitle === "counterpoint") {
      return "counterpoint";
    }

    if (normalizedTitle === "tok prompt") {
      return "tok-prompt";
    }

    if (normalizedTitle === "notebook capture") {
      return "notebook-capture";
    }
  }

  return "generic-note";
}
