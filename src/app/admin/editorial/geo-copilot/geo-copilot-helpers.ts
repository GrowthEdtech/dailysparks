import type { GeoMachineReadabilityStatusRecord } from "../../../../lib/geo-machine-readability-schema";
import type { GeoAioEvidenceRecord } from "../../../../lib/geo-aio-evidence-schema";
import type { GeoMonitoringRunRecord } from "../../../../lib/geo-monitoring-run-schema";
import { GEO_ENGINE_TYPES, type GeoEngineType } from "../../../../lib/geo-prompt-schema";
import type { GeoPromptRecord } from "../../../../lib/geo-prompt-schema";
import type { GeoVisibilityLogRecord } from "../../../../lib/geo-visibility-log-schema";
import {
  inferGeoPromptIntentBucket,
  type GeoPromptIntentBucket,
} from "../../../../lib/geo-prompt-intent";

export type GeoIntentBucketSummary = {
  bucket: GeoPromptIntentBucket;
  label: string;
  promptCount: number;
  logCount: number;
  shareOfModelAverage: number;
  positiveSentimentRate: number;
};

export type GeoVisibilitySummary = {
  trackedPromptCount: number;
  activePromptCount: number;
  shareOfModelAverage: number;
  citationShareAverage: number;
  positiveSentimentRate: number;
  entityAccuracyRate: number;
  lastScanAt: string | null;
  readinessReadyCount: number;
  intentBreakdown: GeoIntentBucketSummary[];
};

export type GeoOpsWindowSummary = {
  logCount: number;
  shareOfModelAverage: number;
  citationShareAverage: number;
  positiveSentimentRate: number;
};

export type GeoOpsEngineCoverageSummary = {
  engine: GeoEngineType;
  attemptedCount: number;
  createdLogCount: number;
  skippedCount: number;
  failedCount: number;
  failureRate: number;
};

export type GeoOpsSummary = {
  latestRunId: string | null;
  latestRunStatus: GeoMonitoringRunRecord["status"] | null;
  latestRunCompletedAt: string | null;
  latestRunFailureRate: number;
  alertLevel: "healthy" | "watch" | "critical";
  alertMessages: string[];
  currentWindow: GeoOpsWindowSummary;
  previousWindow: GeoOpsWindowSummary;
  weekOverWeekShareOfModelDelta: number;
  weekOverWeekCitationShareDelta: number;
  engineCoverage: GeoOpsEngineCoverageSummary[];
  aioEvidence: {
    totalCount: number;
    citedCount: number;
    triggeredCount: number;
    triggerRate: number;
    citationRate: number;
    lastObservedAt: string | null;
  };
};

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function countPositiveRate(logs: GeoVisibilityLogRecord[]) {
  return logs.length > 0
    ? logs.filter((log) => log.sentiment === "positive").length / logs.length
    : 0;
}

function buildWindowSummary(logs: GeoVisibilityLogRecord[]): GeoOpsWindowSummary {
  return {
    logCount: logs.length,
    shareOfModelAverage: average(logs.map((log) => log.shareOfModelScore)),
    citationShareAverage: average(logs.map((log) => log.citationShareScore)),
    positiveSentimentRate: countPositiveRate(logs),
  };
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not checked yet";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
}

function labelIntentBucket(bucket: GeoPromptIntentBucket) {
  switch (bucket) {
    case "workflow":
      return "Workflow intent";
    case "habit-building":
      return "Habit-building intent";
    default:
      return "General intent";
  }
}

export function buildGeoVisibilitySummary(input: {
  prompts: GeoPromptRecord[];
  logs: GeoVisibilityLogRecord[];
  machineReadabilityStatus: GeoMachineReadabilityStatusRecord;
}): GeoVisibilitySummary {
  const { prompts, logs, machineReadabilityStatus } = input;
  const positiveLogs = logs.filter((log) => log.sentiment === "positive");
  const accurateLogs = logs.filter((log) => log.entityAccuracy === "accurate");
  const promptsById = new Map(prompts.map((prompt) => [prompt.id, prompt]));
  const intentBuckets: GeoPromptIntentBucket[] = [
    "workflow",
    "habit-building",
    "general",
  ];
  const readinessValues = [
    machineReadabilityStatus.llmsTxtStatus,
    machineReadabilityStatus.llmsFullTxtStatus,
    machineReadabilityStatus.ssrStatus,
    machineReadabilityStatus.jsonLdStatus,
  ];
  const intentBreakdown = intentBuckets.map((bucket) => {
    const promptsInBucket = prompts.filter(
      (prompt) => inferGeoPromptIntentBucket(prompt) === bucket,
    );
    const logsInBucket = logs.filter((log) => {
      const prompt = promptsById.get(log.promptId);

      return inferGeoPromptIntentBucket({
        prompt: prompt?.prompt ?? log.promptTextSnapshot,
        intentLabel: prompt?.intentLabel ?? log.notes,
        queryVariant: log.queryVariant,
      }) === bucket;
    });

    return {
      bucket,
      label: labelIntentBucket(bucket),
      promptCount: promptsInBucket.length,
      logCount: logsInBucket.length,
      shareOfModelAverage: average(
        logsInBucket.map((log) => log.shareOfModelScore),
      ),
      positiveSentimentRate:
        logsInBucket.length > 0
          ? logsInBucket.filter((log) => log.sentiment === "positive").length /
            logsInBucket.length
          : 0,
    };
  });

  return {
    trackedPromptCount: prompts.length,
    activePromptCount: prompts.filter((prompt) => prompt.active).length,
    shareOfModelAverage: average(logs.map((log) => log.shareOfModelScore)),
    citationShareAverage: average(logs.map((log) => log.citationShareScore)),
    positiveSentimentRate:
      logs.length > 0 ? positiveLogs.length / logs.length : 0,
    entityAccuracyRate: logs.length > 0 ? accurateLogs.length / logs.length : 0,
    lastScanAt: logs[0]?.createdAt ?? machineReadabilityStatus.lastCheckedAt,
    readinessReadyCount: readinessValues.filter((value) => value === "ready")
      .length,
    intentBreakdown,
  };
}

export function buildGeoOpsSummary(input: {
  runs: GeoMonitoringRunRecord[];
  logs: GeoVisibilityLogRecord[];
  aioEvidence: GeoAioEvidenceRecord[];
  now?: Date;
}): GeoOpsSummary {
  const now = input.now ?? new Date();
  const latestRun = [...input.runs].sort((left, right) =>
    right.completedAt.localeCompare(left.completedAt),
  )[0] ?? null;
  const currentWindowStart = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const previousWindowStart = now.getTime() - 14 * 24 * 60 * 60 * 1000;
  const currentWindowLogs = input.logs.filter((log) => {
    const timestamp = new Date(log.createdAt).getTime();

    return Number.isFinite(timestamp) && timestamp >= currentWindowStart;
  });
  const previousWindowLogs = input.logs.filter((log) => {
    const timestamp = new Date(log.createdAt).getTime();

    return (
      Number.isFinite(timestamp) &&
      timestamp >= previousWindowStart &&
      timestamp < currentWindowStart
    );
  });
  const currentWindow = buildWindowSummary(currentWindowLogs);
  const previousWindow = buildWindowSummary(previousWindowLogs);
  const engineCoverage = GEO_ENGINE_TYPES.map((engine) => {
    const breakdown = latestRun?.engineBreakdown.find(
      (entry) => entry.engine === engine,
    );
    const attemptedCount = breakdown?.attemptedCount ?? 0;
    const failedCount = breakdown?.failedCount ?? 0;

    return {
      engine,
      attemptedCount,
      createdLogCount: breakdown?.createdLogCount ?? 0,
      skippedCount: breakdown?.skippedCount ?? 0,
      failedCount,
      failureRate: attemptedCount > 0 ? failedCount / attemptedCount : 0,
    };
  }).filter(
    (entry) =>
      entry.attemptedCount > 0 ||
      latestRun?.notes.toLowerCase().includes(entry.engine) ||
      entry.engine === "google-ai-overviews",
  );
  const latestRunFailureRate =
    latestRun && latestRun.engineAttemptCount > 0
      ? latestRun.failedCount / latestRun.engineAttemptCount
      : 0;
  const triggeredAioEvidence = input.aioEvidence.filter(
    (entry) => entry.aiOverviewStatus !== "not-triggered",
  );
  const citedAioEvidence = input.aioEvidence.filter(
    (entry) => entry.dailySparksCited || entry.aiOverviewStatus === "cited",
  );
  const alertMessages: string[] = [];

  if (!latestRun) {
    alertMessages.push("No GEO monitoring run has completed yet.");
  } else if (latestRun.status === "failed") {
    alertMessages.push("Latest GEO monitoring run failed.");
  } else if (latestRun.status === "partial") {
    alertMessages.push("Latest GEO monitoring run completed with partial coverage.");
  }

  if (latestRunFailureRate > 0) {
    alertMessages.push(
      `${Math.round(latestRunFailureRate * 100)}% of latest engine checks failed.`,
    );
  }

  if (input.aioEvidence.length === 0) {
    alertMessages.push("Google AI Overviews evidence has not been recorded yet.");
  }

  const alertLevel: GeoOpsSummary["alertLevel"] =
    latestRun?.status === "failed" || latestRunFailureRate >= 0.25
      ? "critical"
      : alertMessages.length > 0
        ? "watch"
        : "healthy";

  return {
    latestRunId: latestRun?.id ?? null,
    latestRunStatus: latestRun?.status ?? null,
    latestRunCompletedAt: latestRun?.completedAt ?? null,
    latestRunFailureRate,
    alertLevel,
    alertMessages,
    currentWindow,
    previousWindow,
    weekOverWeekShareOfModelDelta:
      currentWindow.shareOfModelAverage - previousWindow.shareOfModelAverage,
    weekOverWeekCitationShareDelta:
      currentWindow.citationShareAverage - previousWindow.citationShareAverage,
    engineCoverage,
    aioEvidence: {
      totalCount: input.aioEvidence.length,
      citedCount: citedAioEvidence.length,
      triggeredCount: triggeredAioEvidence.length,
      triggerRate:
        input.aioEvidence.length > 0
          ? triggeredAioEvidence.length / input.aioEvidence.length
          : 0,
      citationRate:
        input.aioEvidence.length > 0
          ? citedAioEvidence.length / input.aioEvidence.length
          : 0,
      lastObservedAt: input.aioEvidence[0]?.observedAt ?? null,
    },
  };
}
