import type {
  DailyBriefHistoryRecord,
  DailyBriefPipelineStage,
} from "../../../../lib/daily-brief-history-schema";

const PIPELINE_STAGE_LABELS: Record<DailyBriefPipelineStage, string> = {
  ingested: "Ingested",
  generated: "Generated",
  pdf_built: "PDF built",
  preflight_passed: "Preflight passed",
  delivering: "Delivering",
  published: "Published",
  failed: "Failed",
};

const PIPELINE_STAGE_BADGE_CLASSES: Record<DailyBriefPipelineStage, string> = {
  ingested: "border-sky-200 bg-sky-50 text-sky-800",
  generated: "border-indigo-200 bg-indigo-50 text-indigo-800",
  pdf_built: "border-violet-200 bg-violet-50 text-violet-800",
  preflight_passed: "border-amber-200 bg-amber-50 text-amber-900",
  delivering: "border-blue-200 bg-blue-50 text-blue-800",
  published: "border-emerald-200 bg-emerald-50 text-emerald-800",
  failed: "border-rose-200 bg-rose-50 text-rose-800",
};

type DailyBriefTimelineItem = {
  label: string;
  value: string;
};

export function formatPipelineStageLabel(stage: DailyBriefPipelineStage) {
  return PIPELINE_STAGE_LABELS[stage];
}

export function getPipelineStageBadgeClasses(stage: DailyBriefPipelineStage) {
  return PIPELINE_STAGE_BADGE_CLASSES[stage];
}

export function formatAdminDateTime(value: string | null) {
  if (!value) {
    return "Not recorded yet";
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
        hour12: false,
        timeZone: "UTC",
      }).format(date);
}

export function getDeliverySummaryLabel(entry: DailyBriefHistoryRecord) {
  if (entry.deliveryFailureCount > 0) {
    return `${entry.deliverySuccessCount} delivered · ${entry.deliveryFailureCount} failed`;
  }

  if (entry.deliverySuccessCount > 0) {
    return `${entry.deliverySuccessCount} delivered`;
  }

  if (entry.pipelineStage === "preflight_passed") {
    return "Ready for dispatch";
  }

  if (entry.pipelineStage === "generated" || entry.pipelineStage === "pdf_built") {
    return "Awaiting preflight";
  }

  if (entry.pipelineStage === "ingested") {
    return "Awaiting generation";
  }

  if (entry.pipelineStage === "failed") {
    return "Delivery blocked";
  }

  return "Delivery not started";
}

export function getRetryWindowLabel(entry: DailyBriefHistoryRecord) {
  return entry.retryEligibleUntil
    ? formatAdminDateTime(entry.retryEligibleUntil)
    : "No retry window scheduled";
}

export function buildPipelineTimeline(
  entry: DailyBriefHistoryRecord,
): DailyBriefTimelineItem[] {
  return [
    {
      label: "Candidate snapshot",
      value: formatAdminDateTime(entry.candidateSnapshotAt),
    },
    {
      label: "Generation completed",
      value: formatAdminDateTime(entry.generationCompletedAt),
    },
    {
      label: "PDF built",
      value: formatAdminDateTime(entry.pdfBuiltAt),
    },
    {
      label: "Delivery window",
      value: formatAdminDateTime(entry.deliveryWindowAt),
    },
    {
      label: "Last delivery attempt",
      value: formatAdminDateTime(entry.lastDeliveryAttemptAt),
    },
  ];
}
