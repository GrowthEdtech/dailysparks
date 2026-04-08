import type { DailyBriefNotebookEntryRecord } from "./daily-brief-notebook-store";
import {
  getDailyBriefNotebookEntryLabel,
  type DailyBriefNotebookEntryType,
} from "./daily-brief-notebook-schema";
import type { Programme } from "./mvp-types";

type DailyBriefNotebookWeeklyRecapInput = {
  entries: DailyBriefNotebookEntryRecord[];
  programme: Programme;
  asOf?: string | Date;
};

export type DailyBriefNotebookWeeklyRecapBreakdown = {
  entryType: DailyBriefNotebookEntryType;
  label: string;
  count: number;
};

export type DailyBriefNotebookWeeklyRecapHighlight = {
  entryId: string;
  title: string;
  body: string;
  entryType: DailyBriefNotebookEntryType;
  entryOrigin: DailyBriefNotebookEntryRecord["entryOrigin"];
  sourceHeadline: string;
  updatedAt: string;
};

export type DailyBriefNotebookWeeklyRecapRetrievalPrompt = {
  entryId: string;
  title: string;
  prompt: string;
  entryType: DailyBriefNotebookEntryType;
  sourceHeadline: string;
};

export type DailyBriefNotebookWeeklyRecap = {
  programme: Programme;
  weekKey: string;
  weekLabel: string;
  title: string;
  totalEntries: number;
  systemCount: number;
  authoredCount: number;
  topTags: string[];
  summaryLines: string[];
  entryTypeBreakdown: DailyBriefNotebookWeeklyRecapBreakdown[];
  highlights: DailyBriefNotebookWeeklyRecapHighlight[];
  retrievalPrompts: DailyBriefNotebookWeeklyRecapRetrievalPrompt[];
};

const RETRIEVAL_PROMPT_TEMPLATES: Partial<
  Record<Programme, Partial<Record<DailyBriefNotebookEntryType, string>>>
> = {
  MYP: {
    "inquiry-notebook":
      "How would you answer this inquiry now, and what new evidence would you add?",
    "global-context-note":
      "Which global context lens feels strongest now, and what detail supports it?",
    "compare-connect-note":
      "What new comparison or connection can you make now?",
    vocabulary: "Use this vocabulary idea in a fresh example from this week.",
  },
  DP: {
    claim: "Would you still defend this claim? Which evidence would strengthen it now?",
    counterpoint: "Does this counterpoint still hold, or would you revise it now?",
    "tok-prompt":
      "Has your answer to this TOK prompt shifted? Which perspective would you add now?",
    "notebook-capture":
      "Which part of this capture could become an essay or discussion example?",
  },
};

function resolveAnchorDate(entries: DailyBriefNotebookEntryRecord[], asOf?: string | Date) {
  if (asOf) {
    return new Date(asOf);
  }

  if (entries.length === 0) {
    return new Date();
  }

  const sortedEntries = [...entries].sort((left, right) =>
    getEntryTimestamp(right).localeCompare(getEntryTimestamp(left)),
  );

  return new Date(getEntryTimestamp(sortedEntries[0]!));
}

function getEntryTimestamp(entry: DailyBriefNotebookEntryRecord) {
  return entry.updatedAt || entry.savedAt || entry.createdAt;
}

function getWeekWindow(anchorDate: Date) {
  const normalizedDate = new Date(
    Date.UTC(
      anchorDate.getUTCFullYear(),
      anchorDate.getUTCMonth(),
      anchorDate.getUTCDate(),
    ),
  );
  const day = normalizedDate.getUTCDay();
  const offset = day === 0 ? 6 : day - 1;
  const weekStart = new Date(normalizedDate);
  weekStart.setUTCDate(weekStart.getUTCDate() - offset);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setUTCDate(weekStart.getUTCDate() + 7);

  return {
    weekStart,
    weekEnd,
    nextWeekStart,
    weekKey: weekStart.toISOString().slice(0, 10),
  };
}

function formatWeekLabel(weekStart: Date, weekEnd: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  return `${formatter.format(weekStart)} – ${formatter.format(weekEnd)}`;
}

function isWithinWeek(entry: DailyBriefNotebookEntryRecord, weekStart: Date, nextWeekStart: Date) {
  const entryDate = new Date(getEntryTimestamp(entry));

  return entryDate >= weekStart && entryDate < nextWeekStart;
}

function buildEntryTypeBreakdown(entries: DailyBriefNotebookEntryRecord[]) {
  const counts = new Map<DailyBriefNotebookEntryType, number>();

  for (const entry of entries) {
    counts.set(entry.entryType, (counts.get(entry.entryType) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([entryType, count]) => ({
      entryType,
      label: getDailyBriefNotebookEntryLabel(entryType),
      count,
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function buildTopTags(entries: DailyBriefNotebookEntryRecord[]) {
  const buildRankedTags = (
    selector: (entry: DailyBriefNotebookEntryRecord) => string[],
  ) => {
    const counts = new Map<string, number>();
    const firstSeen = new Map<string, number>();
    let tagIndex = 0;

    for (const entry of entries) {
      for (const tag of selector(entry)) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);

        if (!firstSeen.has(tag)) {
          firstSeen.set(tag, tagIndex);
          tagIndex += 1;
        }
      }
    }

    return Array.from(counts.entries())
      .sort((left, right) => {
        const countDelta = right[1] - left[1];

        if (countDelta !== 0) {
          return countDelta;
        }

        return (firstSeen.get(left[0]) ?? 0) - (firstSeen.get(right[0]) ?? 0);
      })
      .map(([tag]) => tag);
  };

  const buildFirstSeenTags = (
    selector: (entry: DailyBriefNotebookEntryRecord) => string[],
  ) => {
    const seen = new Set<string>();
    const ordered: string[] = [];

    for (const entry of entries) {
      for (const tag of selector(entry)) {
        if (seen.has(tag)) {
          continue;
        }

        seen.add(tag);
        ordered.push(tag);
      }
    }

    return ordered;
  };

  const topInterestTag = buildRankedTags((entry) => entry.interestTags)[0] ?? null;
  const topTopicTags = buildFirstSeenTags((entry) => entry.topicTags).filter(
    (tag) => tag !== topInterestTag,
  );

  return [topInterestTag, ...topTopicTags].filter(Boolean).slice(0, 3) as string[];
}

function buildSummaryLines(
  entries: DailyBriefNotebookEntryRecord[],
  topTags: string[],
  breakdown: DailyBriefNotebookWeeklyRecapBreakdown[],
) {
  const formatNaturalList = (items: string[]) => {
    if (items.length <= 1) {
      return items[0] ?? "";
    }

    if (items.length === 2) {
      return `${items[0]} and ${items[1]}`;
    }

    return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
  };

  const totalEntries = entries.length;
  const authoredCount = entries.filter((entry) => entry.entryOrigin === "authored").length;
  const summaryLines = [
    `You captured ${totalEntries} notebook ${
      totalEntries === 1 ? "entry" : "entries"
    } this week, including ${authoredCount} note${
      authoredCount === 1 ? "" : "s"
    } in your own words.`,
  ];

  if (topTags.length > 0) {
    summaryLines.push(`Your strongest focus areas were ${formatNaturalList(topTags)}.`);
  }

  if (breakdown.length > 0) {
    summaryLines.push(
      `This week leaned most on ${formatNaturalList(
        breakdown.slice(0, 3).map((entry) => entry.label),
      )} thinking.`,
    );
  }

  return summaryLines;
}

function buildHighlights(entries: DailyBriefNotebookEntryRecord[]) {
  return [...entries]
    .sort((left, right) => getEntryTimestamp(right).localeCompare(getEntryTimestamp(left)))
    .slice(0, 3)
    .map((entry) => ({
      entryId: entry.id,
      title: entry.title,
      body: entry.body,
      entryType: entry.entryType,
      entryOrigin: entry.entryOrigin,
      sourceHeadline: entry.sourceHeadline,
      updatedAt: getEntryTimestamp(entry),
    }));
}

function getRetrievalPromptTemplate(
  programme: Programme,
  entryType: DailyBriefNotebookEntryType,
) {
  return (
    RETRIEVAL_PROMPT_TEMPLATES[programme]?.[entryType] ??
    "What would you add, revise, or question if you returned to this note today?"
  );
}

function buildRetrievalPrompts(
  programme: Programme,
  entries: DailyBriefNotebookEntryRecord[],
) {
  const rankedEntries = [...entries].sort((left, right) => {
    if (left.entryOrigin !== right.entryOrigin) {
      return left.entryOrigin === "authored" ? -1 : 1;
    }

    return getEntryTimestamp(left).localeCompare(getEntryTimestamp(right));
  });

  return rankedEntries.slice(0, 3).map((entry) => ({
    entryId: entry.id,
    title: entry.title,
    prompt: getRetrievalPromptTemplate(programme, entry.entryType),
    entryType: entry.entryType,
    sourceHeadline: entry.sourceHeadline,
  }));
}

export function buildDailyBriefNotebookWeeklyRecap(
  input: DailyBriefNotebookWeeklyRecapInput,
): DailyBriefNotebookWeeklyRecap | null {
  if (input.programme !== "MYP" && input.programme !== "DP") {
    return null;
  }

  const relevantEntries = input.entries.filter(
    (entry) => entry.programme === input.programme,
  );
  const anchorDate = resolveAnchorDate(relevantEntries, input.asOf);
  const { weekStart, weekEnd, nextWeekStart, weekKey } = getWeekWindow(anchorDate);
  const weeklyEntries = relevantEntries.filter((entry) =>
    isWithinWeek(entry, weekStart, nextWeekStart),
  );

  if (weeklyEntries.length === 0) {
    return null;
  }

  const breakdown = buildEntryTypeBreakdown(weeklyEntries);
  const topTags = buildTopTags(weeklyEntries);
  const systemCount = weeklyEntries.filter((entry) => entry.entryOrigin === "system").length;
  const authoredCount = weeklyEntries.filter((entry) => entry.entryOrigin === "authored").length;

  return {
    programme: input.programme,
    weekKey,
    weekLabel: formatWeekLabel(weekStart, weekEnd),
    title: `${input.programme} weekly notebook recap`,
    totalEntries: weeklyEntries.length,
    systemCount,
    authoredCount,
    topTags,
    summaryLines: buildSummaryLines(weeklyEntries, topTags, breakdown),
    entryTypeBreakdown: breakdown,
    highlights: buildHighlights(weeklyEntries),
    retrievalPrompts: buildRetrievalPrompts(input.programme, weeklyEntries),
  };
}
