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

export const DAILY_BRIEF_NOTEBOOK_ENTRY_TYPE_LABELS: Record<
  DailyBriefNotebookEntryType,
  string
> = {
  "inquiry-notebook": "Inquiry",
  "global-context-note": "Global context",
  "compare-connect-note": "Compare-connect",
  vocabulary: "Vocabulary",
  claim: "Claim",
  counterpoint: "Counterpoint",
  "tok-prompt": "TOK prompt",
  "notebook-capture": "Capture",
  "generic-note": "Notes",
};

export const DAILY_BRIEF_AUTHORED_ENTRY_TYPES_BY_PROGRAMME = {
  MYP: [
    "inquiry-notebook",
    "global-context-note",
    "compare-connect-note",
    "vocabulary",
  ],
  DP: ["claim", "counterpoint", "tok-prompt", "notebook-capture"],
} as const satisfies Partial<
  Record<Programme, readonly DailyBriefNotebookEntryType[]>
>;

export type DailyBriefNotebookEntryOrigin = "system" | "authored";
export type DailyBriefNotebookSavedSource = "dashboard" | "reflection";

export type DailyBriefNotebookEntryRecord = {
  id: string;
  parentId: string;
  parentEmail: string;
  studentId: string;
  programme: Programme;
  entryType: DailyBriefNotebookEntryType;
  entryOrigin: DailyBriefNotebookEntryOrigin;
  title: string;
  body: string;
  knowledgeBankTitle: string;
  sourceBriefId: string;
  sourceScheduledFor: string;
  sourceHeadline: string;
  topicTags: string[];
  interestTags: string[];
  savedSource: DailyBriefNotebookSavedSource;
  savedAt: string;
  createdAt: string;
  updatedAt: string;
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

export function getDailyBriefNotebookEntryLabel(
  entryType: DailyBriefNotebookEntryType,
) {
  return DAILY_BRIEF_NOTEBOOK_ENTRY_TYPE_LABELS[entryType] ?? "Notes";
}

export function getDailyBriefAuthoredEntryTypes(
  programme: Programme,
): DailyBriefNotebookEntryType[] {
  if (programme === "MYP") {
    return [...DAILY_BRIEF_AUTHORED_ENTRY_TYPES_BY_PROGRAMME.MYP];
  }

  if (programme === "DP") {
    return [...DAILY_BRIEF_AUTHORED_ENTRY_TYPES_BY_PROGRAMME.DP];
  }

  return [];
}

export function isAuthoredNotebookEntryTypeAllowed(
  programme: Programme,
  entryType: DailyBriefNotebookEntryType,
) {
  return getDailyBriefAuthoredEntryTypes(programme).includes(entryType);
}
