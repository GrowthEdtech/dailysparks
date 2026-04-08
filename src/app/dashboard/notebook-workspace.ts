import type { DailyBriefNotebookEntryRecord } from "../../lib/daily-brief-notebook-store";
import {
  getDailyBriefNotebookEntryLabel,
} from "../../lib/daily-brief-notebook-schema";

export const ALL_NOTEBOOK_FILTER_ID = "all";
export const ALL_NOTEBOOK_TAG_FILTER_ID = "all";

export type NotebookSortOrder = "newest" | "oldest" | "title";

export type NotebookFilterOption = {
  id: string;
  label: string;
  count: number;
};

export function buildNotebookFilterOptions(
  entries: DailyBriefNotebookEntryRecord[],
): NotebookFilterOption[] {
  const counts = new Map<DailyBriefNotebookEntryRecord["entryType"], number>();

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
      label: getDailyBriefNotebookEntryLabel(entryType),
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

function normalizeSearchQuery(value: string) {
  return value.trim().toLowerCase();
}

function entryMatchesSearchQuery(
  entry: DailyBriefNotebookEntryRecord,
  searchQuery: string,
) {
  if (!searchQuery) {
    return true;
  }

  const haystacks = [
    entry.title,
    entry.body,
    entry.sourceHeadline,
    entry.knowledgeBankTitle,
    ...entry.topicTags,
    ...entry.interestTags,
  ].map((value) => value.toLowerCase());

  return haystacks.some((value) => value.includes(searchQuery));
}

function entryMatchesTagFilter(
  entry: DailyBriefNotebookEntryRecord,
  tagFilter: string,
) {
  if (!tagFilter || tagFilter === ALL_NOTEBOOK_TAG_FILTER_ID) {
    return true;
  }

  return [...entry.topicTags, ...entry.interestTags].includes(tagFilter);
}

function sortNotebookEntries(
  entries: DailyBriefNotebookEntryRecord[],
  sortOrder: NotebookSortOrder,
) {
  const sortedEntries = [...entries];
  const getEntryTimestamp = (entry: DailyBriefNotebookEntryRecord) =>
    entry.updatedAt || entry.savedAt || entry.createdAt;

  sortedEntries.sort((left, right) => {
    if (sortOrder === "oldest") {
      return getEntryTimestamp(left).localeCompare(getEntryTimestamp(right));
    }

    if (sortOrder === "title") {
      return (
        left.title.localeCompare(right.title) ||
        getEntryTimestamp(right).localeCompare(getEntryTimestamp(left))
      );
    }

    return getEntryTimestamp(right).localeCompare(getEntryTimestamp(left));
  });

  return sortedEntries;
}

export function buildNotebookTagOptions(entries: DailyBriefNotebookEntryRecord[]) {
  return Array.from(
    new Set(
      entries.flatMap((entry) => [...entry.topicTags, ...entry.interestTags]),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

export function applyNotebookWorkspaceFilters(
  entries: DailyBriefNotebookEntryRecord[],
  options: {
    entryTypeFilterId: string;
    searchQuery: string;
    tagFilter: string;
    sortOrder: NotebookSortOrder;
  },
) {
  const filteredEntries = filterNotebookEntries(entries, options.entryTypeFilterId).filter(
    (entry) =>
      entryMatchesSearchQuery(entry, normalizeSearchQuery(options.searchQuery)) &&
      entryMatchesTagFilter(entry, options.tagFilter),
  );

  return sortNotebookEntries(filteredEntries, options.sortOrder);
}
