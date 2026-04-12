import type { GeoMonitoringRunStatus } from "./geo-monitoring-run-schema";

export const OPERATIONS_HEALTH_RUN_SOURCES = ["scheduled", "manual"] as const;
export const OPERATIONS_HEALTH_RUN_STATUSES = [
  "healthy",
  "warning",
  "critical",
] as const;
export const OPERATIONS_HEALTH_ALERT_AREAS = [
  "daily-brief",
  "planned-notifications",
  "geo-monitoring",
  "billing-status",
] as const;
export const OPERATIONS_HEALTH_ALERT_SEVERITIES = [
  "warning",
  "critical",
] as const;
export const OPERATIONS_HEALTH_REMEDIATION_ACTIONS = [
  "retry-delivery",
  "blocked-canary-review",
  "growth-reconciliation",
  "geo-monitoring",
] as const;
export const OPERATIONS_HEALTH_REMEDIATION_STATUSES = [
  "executed",
  "skipped",
  "failed",
] as const;

export type OperationsHealthRunSource =
  (typeof OPERATIONS_HEALTH_RUN_SOURCES)[number];
export type OperationsHealthRunStatus =
  (typeof OPERATIONS_HEALTH_RUN_STATUSES)[number];
export type OperationsHealthAlertArea =
  (typeof OPERATIONS_HEALTH_ALERT_AREAS)[number];
export type OperationsHealthAlertSeverity =
  (typeof OPERATIONS_HEALTH_ALERT_SEVERITIES)[number];
export type OperationsHealthRemediationActionType =
  (typeof OPERATIONS_HEALTH_REMEDIATION_ACTIONS)[number];
export type OperationsHealthRemediationStatus =
  (typeof OPERATIONS_HEALTH_REMEDIATION_STATUSES)[number];

export type OperationsHealthSyntheticCanaryUnhealthyTarget = {
  parentEmail: string;
  reason: string;
};

export type OperationsHealthSyntheticCanarySummary = {
  enabled: boolean;
  configuredParentEmails: string[];
  selectedParentEmail: string | null;
  healthyParentEmails: string[];
  fallbackActivated: boolean;
  blocksProduction: boolean;
  unhealthyTargets: OperationsHealthSyntheticCanaryUnhealthyTarget[];
};

export type OperationsHealthDailyBriefSummary = {
  expectedProductionCount: number;
  generatedCount: number;
  approvedCount: number;
  publishedCount: number;
  failedCount: number;
  missingProductionCount: number;
  retryCandidateCount: number;
  blockedCanaryCount: number;
  syntheticCanary: OperationsHealthSyntheticCanarySummary;
};

export type OperationsHealthNotificationsSummary = {
  queueCount: number;
  pendingCount: number;
  retryDueCount: number;
  coolingDownCount: number;
  escalatedCount: number;
  dedupedCount: number;
  under24hCount: number;
  between24hAnd72hCount: number;
  over72hCount: number;
};

export type OperationsHealthGeoSummary = {
  latestRunStatus: GeoMonitoringRunStatus | null;
  latestRunStartedAt: string | null;
  stale: boolean;
  timeoutCount: number;
  activePromptCount: number;
  createdLogCount: number;
  failedCount: number;
  machineReadabilityReadyCount: number;
};

export type OperationsHealthBillingSummary = {
  actionableCount: number;
  sentTodayCount: number;
  failedTodayCount: number;
  dedupedTodayCount: number;
  escalatedCount: number;
};

export type OperationsHealthAlert = {
  area: OperationsHealthAlertArea;
  severity: OperationsHealthAlertSeverity;
  title: string;
  detail: string;
  metricValue: number | null;
  webhookDelivered?: boolean | null;
  webhookUsed?: boolean | null;
  emailDelivered?: boolean | null;
  emailUsed?: boolean | null;
  emailRecipient?: string | null;
  emailMessageId?: string | null;
};

export type OperationsHealthRemediationAction = {
  action: OperationsHealthRemediationActionType;
  status: OperationsHealthRemediationStatus;
  detail: string;
  startedAt: string;
  completedAt: string;
};

export type OperationsHealthRunRecord = {
  id: string;
  source: OperationsHealthRunSource;
  runDate: string;
  status: OperationsHealthRunStatus;
  dailyBrief: OperationsHealthDailyBriefSummary;
  notifications: OperationsHealthNotificationsSummary;
  geo: OperationsHealthGeoSummary;
  billing: OperationsHealthBillingSummary;
  alerts: OperationsHealthAlert[];
  remediationActions: OperationsHealthRemediationAction[];
  startedAt: string;
  completedAt: string;
};
