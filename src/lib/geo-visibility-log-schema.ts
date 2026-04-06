import type { GeoEngineType } from "./geo-prompt-schema";

export const GEO_VISIBILITY_LOG_SOURCES = [
  "manual",
  "scheduled",
  "admin-run",
] as const;
export const GEO_VISIBILITY_MENTION_STATUSES = [
  "recommended",
  "mentioned",
  "not-mentioned",
] as const;
export const GEO_SENTIMENT_LABELS = [
  "positive",
  "neutral",
  "negative",
] as const;
export const GEO_ENTITY_ACCURACY_LABELS = [
  "accurate",
  "mixed",
  "incorrect",
] as const;

export type GeoVisibilityMentionStatus =
  (typeof GEO_VISIBILITY_MENTION_STATUSES)[number];
export type GeoVisibilityLogSource = (typeof GEO_VISIBILITY_LOG_SOURCES)[number];
export type GeoSentimentLabel = (typeof GEO_SENTIMENT_LABELS)[number];
export type GeoEntityAccuracyLabel =
  (typeof GEO_ENTITY_ACCURACY_LABELS)[number];

export type GeoVisibilityLogRecord = {
  id: string;
  source: GeoVisibilityLogSource;
  monitoringRunId: string | null;
  promptId: string;
  promptTextSnapshot: string;
  queryVariant: string;
  engine: GeoEngineType;
  engineModel: string;
  mentionStatus: GeoVisibilityMentionStatus;
  citationUrls: string[];
  shareOfModelScore: number;
  citationShareScore: number;
  sentiment: GeoSentimentLabel;
  entityAccuracy: GeoEntityAccuracyLabel;
  responseExcerpt: string;
  notes: string;
  createdAt: string;
};
