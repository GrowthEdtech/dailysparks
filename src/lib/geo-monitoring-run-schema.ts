import type { GeoEngineType } from "./geo-prompt-schema";
import type {
  GeoSentimentLabel,
  GeoVisibilityMentionStatus,
} from "./geo-visibility-log-schema";

export const GEO_MONITORING_RUN_SOURCES = ["scheduled", "manual"] as const;
export const GEO_MONITORING_RUN_STATUSES = [
  "queued",
  "running",
  "completed",
  "partial",
  "failed",
] as const;
export const GEO_MONITORING_QUERY_OUTCOMES = [
  "success",
  "skipped",
  "failed",
] as const;

export type GeoMonitoringRunSource =
  (typeof GEO_MONITORING_RUN_SOURCES)[number];
export type GeoMonitoringRunStatus =
  (typeof GEO_MONITORING_RUN_STATUSES)[number];
export type GeoMonitoringQueryOutcome =
  (typeof GEO_MONITORING_QUERY_OUTCOMES)[number];

export type GeoMonitoringEngineBreakdown = {
  engine: GeoEngineType;
  attemptedCount: number;
  createdLogCount: number;
  skippedCount: number;
  failedCount: number;
};

export type GeoMonitoringQueryDiagnostic = {
  promptId: string;
  promptIntentLabel: string;
  queryVariant: string;
  engine: GeoEngineType;
  outcome: GeoMonitoringQueryOutcome;
  mentionStatus: GeoVisibilityMentionStatus | null;
  sentiment: GeoSentimentLabel | null;
  citationUrlCount: number;
  durationMs: number;
  reason: string;
  logId: string | null;
};

export type GeoMonitoringRunRecord = {
  id: string;
  source: GeoMonitoringRunSource;
  status: GeoMonitoringRunStatus;
  activePromptCount: number;
  expandedQueryCount: number;
  engineAttemptCount: number;
  createdLogCount: number;
  skippedCount: number;
  failedCount: number;
  machineReadabilityReadyCount: number;
  rankabilityScore: number;
  citationReadinessScore: number;
  biasResistanceScore: number;
  notes: string;
  startedAt: string;
  completedAt: string;
  engineBreakdown: GeoMonitoringEngineBreakdown[];
  queryDiagnostics: GeoMonitoringQueryDiagnostic[];
};
