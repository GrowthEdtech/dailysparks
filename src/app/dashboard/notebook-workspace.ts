import type { DailyBriefNotebookEntryRecord } from "../../lib/daily-brief-notebook-store";
import type { DailyBriefNotebookEntryType } from "../../lib/daily-brief-notebook-schema";

export const ALL_NOTEBOOK_FILTER_ID = "all";

export type NotebookFilterOption = {
  id: string;
  label: string;
  count: number;
};

const NOTEBOOK_FILTER_LABELS: Record<DailyBriefNotebookEntryType, string> = {
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

export function buildNotebookFilterOptions(
  entries: DailyBriefNotebookEntryRecord[],
): NotebookFilterOption[] {
  const counts = new Map<string, number>();

  for (const entry of entries) {
    counts.set(entry.entryType, (counts.get(entry.entryType) ?? 0) + 1);
  }

  return [
    {
      id: ALL_NOTEBOOK_FILTER_ID,
      label: "All notes",
      count: entries.length,
    },
    ...Array.from(counts.entries()).map(([entryType, count]) => ({
      id: entryType,
      label: NOTEBOOK_FILTER_LABELS[entryType as DailyBriefNotebookEntryType] ?? "Notes",
      count,
    })),
  ];
}

export function filterNotebookEntries(
  entries: DailyBriefNotebookEntryRecord[],
  filterId: string,
) {
  if (!filterId || filterId === ALL_NOTEBOOK_FILTER_ID) {
    return entries;
  }

  return entries.filter((entry) => entry.entryType === filterId);
}

export function resolveSelectedNotebookEntry(
  entries: DailyBriefNotebookEntryRecord[],
  selectedId: string | null,
) {
  if (entries.length === 0) {
    return null;
  }

  if (!selectedId) {
    return entries[0] ?? null;
  }

  return entries.find((entry) => entry.id === selectedId) ?? entries[0] ?? null;
}

export function buildNotebookEntryPreview(entry: DailyBriefNotebookEntryRecord) {
  const normalized = entry.body.replace(/\s+/g, " ").trim();

  if (normalized.length <= 96) {
    return normalized;
  }

  return `${normalized.slice(0, 93).trimEnd()}...`;
}
