import {
  formatDailyBriefRendererLabel,
  formatDailyBriefRendererModeLabel,
} from "./renderer-options";

type TestRunStageResult = {
  status: number;
  body: unknown;
};

export type ManualTestRunResult = {
  success: boolean;
  runDate: string;
  targetParentEmails: string[];
  rendererMode?: string;
  renderer?: string;
  rendererPolicyLabel?: string;
  failedStage?: string;
  stages?: Record<string, TestRunStageResult>;
  message?: string;
};

type ManualBackfillSummary = {
  briefId?: string;
  parentEmail?: string;
  rendererMode?: string;
  renderer?: string;
  rendererPolicyLabel?: string;
  deliveryAttemptCount?: number;
  deliverySuccessCount?: number;
  deliveryFailureCount?: number;
  errorMessage?: string;
  skippedReason?: string;
};

function getDeliverStageBody(result: ManualTestRunResult | null) {
  const deliverBody = result?.stages?.deliver?.body;

  return typeof deliverBody === "object" && deliverBody !== null
    ? (deliverBody as Record<string, unknown>)
    : null;
}

function getManualBackfillSummary(
  result: ManualTestRunResult | null,
): ManualBackfillSummary | null {
  const deliverBody = getDeliverStageBody(result);
  const manualBackfill = deliverBody?.manualBackfill;

  return typeof manualBackfill === "object" && manualBackfill !== null
    ? (manualBackfill as ManualBackfillSummary)
    : null;
}

function getDeliverSummary(result: ManualTestRunResult | null) {
  const deliverBody = getDeliverStageBody(result);
  const summary = deliverBody?.summary;

  return typeof summary === "object" && summary !== null
    ? (summary as Record<string, unknown>)
    : null;
}

export function buildManualTestRunOutcomeLabel(
  result: ManualTestRunResult | null,
) {
  if (!result?.stages) {
    return "No test run has completed yet.";
  }

  const manualBackfill = getManualBackfillSummary(result);

  if (
    typeof manualBackfill?.deliverySuccessCount === "number" &&
    manualBackfill.deliverySuccessCount > 0
  ) {
    return `${manualBackfill.deliverySuccessCount} delivery sent via manual fallback.`;
  }

  if (manualBackfill?.errorMessage) {
    return `Manual fallback failed: ${manualBackfill.errorMessage}`;
  }

  if (manualBackfill?.skippedReason) {
    return `No delivery was sent. ${manualBackfill.skippedReason}`;
  }

  const deliverSummary = getDeliverSummary(result);
  const deliveredCount =
    typeof deliverSummary?.deliveredCount === "number"
      ? deliverSummary.deliveredCount
      : 0;

  if (deliveredCount > 0) {
    return `${deliveredCount} delivery sent in the staged canary wave.`;
  }

  return "No delivery was sent in the staged canary wave.";
}

export function formatManualTestRunStageSummary(
  result: ManualTestRunResult | null,
) {
  if (!result?.stages) {
    return "No test run has completed yet.";
  }

  const outcomeLabel = buildManualTestRunOutcomeLabel(result);
  const metadataLines = [
    result.rendererMode
      ? `Renderer mode: ${formatDailyBriefRendererModeLabel(result.rendererMode)}`
      : null,
    result.renderer
      ? `Resolved renderer: ${formatDailyBriefRendererLabel(result.renderer)}`
      : null,
    result.rendererPolicyLabel ?? null,
  ].filter(Boolean);

  return [
    ...metadataLines,
    ...Object.entries(result.stages)
    .map(([stageName, stageResult]) => {
      const summary =
        typeof stageResult.body === "object" && stageResult.body !== null
          ? JSON.stringify(stageResult.body, null, 2)
          : String(stageResult.body);

      if (stageName === "deliver") {
        return `${stageName.toUpperCase()} (${stageResult.status})\nFinal outcome: ${outcomeLabel}\n${summary}`;
      }

      return `${stageName.toUpperCase()} (${stageResult.status})\n${summary}`;
    }),
  ].join("\n\n");
}
