import type { GeoEngineType } from "./geo-prompt-schema";

export const GEO_MONITORING_RUN_SOURCES = ["scheduled", "manual"] as const;
export const GEO_MONITORING_RUN_STATUSES = [
  "completed",
  "partial",
  "failed",
] as const;

export type GeoMonitoringRunSource =
  (typeof GEO_MONITORING_RUN_SOURCES)[number];
export type GeoMonitoringRunStatus =
  (typeof GEO_MONITORING_RUN_STATUSES)[number];

export type GeoMonitoringEngineBreakdown = {
  engine: GeoEngineType;
  attemptedCount: number;
  createdLogCount: number;
  skippedCount: number;
  failedCount: number;
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
};
