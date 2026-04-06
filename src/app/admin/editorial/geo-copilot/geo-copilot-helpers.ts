import type { GeoMachineReadabilityStatusRecord } from "../../../../lib/geo-machine-readability-schema";
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

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
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
