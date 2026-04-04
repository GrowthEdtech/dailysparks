import type { DailyBriefEditorialCohort } from "./daily-brief-cohorts";

export const DAILY_BRIEF_SELECTION_DECISIONS = ["new", "follow_up"] as const;
export const DAILY_BRIEF_BLOCKED_TOPIC_POLICIES = [
  "exact_headline",
  "normalized_headline",
  "topic_cluster_cooldown",
] as const;

export type DailyBriefSelectionDecision =
  (typeof DAILY_BRIEF_SELECTION_DECISIONS)[number];
export type DailyBriefBlockedTopicPolicy =
  (typeof DAILY_BRIEF_BLOCKED_TOPIC_POLICIES)[number];

export type DailyBriefBlockedTopic = {
  clusterKey: string;
  headline: string;
  policy: DailyBriefBlockedTopicPolicy;
  reason: string;
  existingScheduledFor: string;
  existingEditorialCohort: DailyBriefEditorialCohort;
};

export function normalizeHeadlineForComparison(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const HEADLINE_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

export function extractHeadlineKeywords(value: string) {
  return normalizeHeadlineForComparison(value)
    .split(" ")
    .map((token) => token.trim())
    .filter(
      (token) => token.length > 1 && !HEADLINE_STOPWORDS.has(token),
    );
}
