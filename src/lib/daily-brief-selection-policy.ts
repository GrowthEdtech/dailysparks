import type { DailyBriefEditorialCohort } from "./daily-brief-cohorts";
import type { DailyBriefHistoryRecord } from "./daily-brief-history-schema";
import {
  extractHeadlineKeywords,
  normalizeHeadlineForComparison,
  type DailyBriefBlockedTopic,
  type DailyBriefSelectionDecision,
} from "./daily-brief-selection-types";
import {
  rankDailyTopicClusters,
  type SelectedDailyTopic,
} from "./brief-selector";
import type { Programme } from "./mvp-types";

const NORMALIZED_HEADLINE_BLOCK_WINDOW_DAYS = 30;

function getDaysBetween(left: string, right: string) {
  const leftDate = Date.parse(`${left}T00:00:00.000Z`);
  const rightDate = Date.parse(`${right}T00:00:00.000Z`);

  if (Number.isNaN(leftDate) || Number.isNaN(rightDate)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs(leftDate - rightDate) / (1000 * 60 * 60 * 24);
}

function toTimestamp(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function buildHistoryClusterKey(entry: DailyBriefHistoryRecord) {
  return (
    entry.topicClusterKey ||
    entry.normalizedHeadline ||
    normalizeHeadlineForComparison(entry.headline)
  );
}

function hasSourceOverlap(
  entry: DailyBriefHistoryRecord,
  topic: SelectedDailyTopic,
) {
  const sourceIds = new Set(topic.sourceReferences.map((reference) => reference.sourceId));

  return entry.sourceReferences.some((reference) => sourceIds.has(reference.sourceId));
}

function hasTokenOverlap(
  entry: DailyBriefHistoryRecord,
  topicNormalizedHeadline: string,
) {
  const currentTokens = new Set(extractHeadlineKeywords(topicNormalizedHeadline));
  const previousTokens = new Set(
    extractHeadlineKeywords(entry.normalizedHeadline || entry.headline),
  );
  let overlap = 0;

  for (const token of currentTokens) {
    if (previousTokens.has(token)) {
      overlap += 1;
    }
  }

  return overlap >= 2;
}

function isSameTopicCluster(
  entry: DailyBriefHistoryRecord,
  topic: SelectedDailyTopic,
  topicNormalizedHeadline: string,
) {
  const historyClusterKey = buildHistoryClusterKey(entry);

  return (
    historyClusterKey === topic.clusterKey ||
    historyClusterKey === topicNormalizedHeadline ||
    (hasSourceOverlap(entry, topic) && hasTokenOverlap(entry, topicNormalizedHeadline))
  );
}

function buildBlockedTopic(input: {
  entry: DailyBriefHistoryRecord;
  topic: SelectedDailyTopic;
  policy: DailyBriefBlockedTopic["policy"];
  reason: string;
}): DailyBriefBlockedTopic {
  return {
    clusterKey: buildHistoryClusterKey(input.entry),
    headline: input.topic.headline,
    policy: input.policy,
    reason: input.reason,
    existingScheduledFor: input.entry.scheduledFor,
    existingEditorialCohort: input.entry.editorialCohort,
  };
}

export type DailyBriefSelectionAudit = {
  decision: DailyBriefSelectionDecision | null;
  overrideNote: string;
  blockedTopics: DailyBriefBlockedTopic[];
};

export type SelectedTopicDecision = {
  topic: SelectedDailyTopic | null;
  topicClusterKey: string | null;
  normalizedHeadline: string | null;
  latestPublishedAt: string | null;
  selectionAudit: DailyBriefSelectionAudit;
};

export function selectTopicWithPolicy(input: {
  candidates: Parameters<typeof rankDailyTopicClusters>[0];
  eligibleProgrammes: Programme[];
  historyEntries: DailyBriefHistoryRecord[];
  scheduledFor: string;
  editorialCohort: DailyBriefEditorialCohort;
  recordKind: DailyBriefHistoryRecord["recordKind"];
  topicReuseWindowDays: number;
}): SelectedTopicDecision {
  const rankedTopics = rankDailyTopicClusters(
    input.candidates,
    input.eligibleProgrammes,
  );

  if (rankedTopics.length === 0) {
    return {
      topic: null,
      topicClusterKey: null,
      normalizedHeadline: null,
      latestPublishedAt: null,
      selectionAudit: {
        decision: null,
        overrideNote: "",
        blockedTopics: [],
      },
    };
  }

  if (input.recordKind !== "production") {
    const topic = rankedTopics[0] ?? null;

    return {
      topic,
      topicClusterKey: topic?.clusterKey ?? null,
      normalizedHeadline: topic
        ? normalizeHeadlineForComparison(topic.headline)
        : null,
      latestPublishedAt: topic?.latestPublishedAt ?? null,
      selectionAudit: {
        decision: topic ? "new" : null,
        overrideNote: "",
        blockedTopics: [],
      },
    };
  }

  const publishedProductionEntries = input.historyEntries.filter(
    (entry) => entry.recordKind === "production" && entry.status === "published",
  );
  const blockedTopics: DailyBriefBlockedTopic[] = [];

  for (const topic of rankedTopics) {
    const topicNormalizedHeadline = normalizeHeadlineForComparison(topic.headline);

    const exactHeadlineMatch = publishedProductionEntries.find(
      (entry) => entry.headline.trim() === topic.headline.trim(),
    );

    if (exactHeadlineMatch) {
      blockedTopics.push(
        buildBlockedTopic({
          entry: exactHeadlineMatch,
          topic,
          policy: "exact_headline",
          reason:
            "An identical published headline already exists in the editorial archive.",
        }),
      );
      continue;
    }

    const normalizedHeadlineMatch = publishedProductionEntries.find(
      (entry) =>
        getDaysBetween(entry.scheduledFor, input.scheduledFor) <=
          NORMALIZED_HEADLINE_BLOCK_WINDOW_DAYS &&
        normalizeHeadlineForComparison(entry.normalizedHeadline || entry.headline) ===
          topicNormalizedHeadline,
    );

    if (normalizedHeadlineMatch) {
      blockedTopics.push(
        buildBlockedTopic({
          entry: normalizedHeadlineMatch,
          topic,
          policy: "normalized_headline",
          reason:
            "A normalized version of this headline was already published recently.",
        }),
      );
      continue;
    }

    const recentSameCohortEntries = publishedProductionEntries
      .filter(
        (entry) =>
          entry.editorialCohort === input.editorialCohort &&
          getDaysBetween(entry.scheduledFor, input.scheduledFor) <=
            input.topicReuseWindowDays &&
          isSameTopicCluster(entry, topic, topicNormalizedHeadline),
      )
      .sort((left, right) => right.scheduledFor.localeCompare(left.scheduledFor));

    if (recentSameCohortEntries.length === 0) {
      return {
        topic,
        topicClusterKey: topic.clusterKey,
        normalizedHeadline: topicNormalizedHeadline,
        latestPublishedAt: topic.latestPublishedAt,
        selectionAudit: {
          decision: "new",
          overrideNote: "",
          blockedTopics,
        },
      };
    }

    const latestRelatedEntry = recentSameCohortEntries[0]!;
    const currentPublishedAt = toTimestamp(topic.latestPublishedAt);
    const previousPublishedAt = toTimestamp(
      latestRelatedEntry.topicLatestPublishedAt ??
        latestRelatedEntry.generationCompletedAt ??
        `${latestRelatedEntry.scheduledFor}T00:00:00.000Z`,
    );
    const currentNormalized = topicNormalizedHeadline;
    const previousNormalized = normalizeHeadlineForComparison(
      latestRelatedEntry.normalizedHeadline || latestRelatedEntry.headline,
    );

    if (
      currentNormalized !== previousNormalized &&
      currentPublishedAt > previousPublishedAt
    ) {
      return {
        topic,
        topicClusterKey: buildHistoryClusterKey(latestRelatedEntry),
        normalizedHeadline: currentNormalized,
        latestPublishedAt: topic.latestPublishedAt,
        selectionAudit: {
          decision: "follow_up",
          overrideNote:
            "Follow-up exception approved because the topic has a newer development and a distinct headline inside the cooldown window.",
          blockedTopics,
        },
      };
    }

    blockedTopics.push(
      buildBlockedTopic({
        entry: latestRelatedEntry,
        topic,
        policy: "topic_cluster_cooldown",
        reason:
          "This topic cluster is still inside the cohort cooldown window and does not yet qualify as a follow-up.",
      }),
    );
  }

  return {
    topic: null,
    topicClusterKey: null,
    normalizedHeadline: null,
    latestPublishedAt: null,
    selectionAudit: {
      decision: null,
      overrideNote: "",
      blockedTopics,
    },
  };
}
