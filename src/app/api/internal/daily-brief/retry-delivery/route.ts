import {
  listDailyBriefHistory,
  updateDailyBriefHistoryEntry,
} from "../../../../../lib/daily-brief-history-store";
import type { DailyBriefHistoryRecord } from "../../../../../lib/daily-brief-history-schema";
import { planDailyBriefDispatch } from "../../../../../lib/daily-brief-delivery-policy";
import { emitDailyBriefOpsAlert } from "../../../../../lib/daily-brief-ops-alerts";
import { deliverHistoryBriefToProfiles } from "../../../../../lib/daily-brief-stage-delivery";
import {
  getDailyBriefSchedulerHeaderName,
  hasValidDailyBriefSchedulerSecret,
  isDailyBriefSchedulerConfigured,
} from "../../../../../lib/daily-brief-run-auth";
import { listEligibleDeliveryProfiles } from "../../../../../lib/mvp-store";

type DailyBriefRetryDeliveryRequestBody = {
  runDate?: string;
};

function serviceUnavailable(message: string) {
  return Response.json({ message }, { status: 503 });
}

function unauthorized(message: string) {
  return Response.json({ message }, { status: 401 });
}

function badRequest(message: string) {
  return Response.json({ message }, { status: 400 });
}

function buildRunDate(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function isValidRunDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}

function buildRetryAttemptTimestamp(runDate: string) {
  const parsed = Date.parse(`${runDate}T09:10:00+08:00`);

  return Number.isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString();
}

function isRetryCandidate(
  entry: DailyBriefHistoryRecord,
  retryAttemptTimestamp: string,
) {
  return (
    entry.failedDeliveryTargets.length > 0 &&
    Boolean(entry.retryEligibleUntil) &&
    entry.retryEligibleUntil! >= retryAttemptTimestamp
  );
}

function appendAdminNotes(existing: string, note: string) {
  const trimmedExisting = existing.trim();
  const trimmedNote = note.trim();

  if (!trimmedExisting) {
    return trimmedNote;
  }

  if (!trimmedNote) {
    return trimmedExisting;
  }

  return `${trimmedExisting}\n${trimmedNote}`;
}

async function parseRequestBody(
  request: Request,
): Promise<DailyBriefRetryDeliveryRequestBody | Response> {
  const contentLength = request.headers.get("content-length");

  if (contentLength === "0") {
    return {};
  }

  const bodyText = await request.text();

  if (!bodyText.trim()) {
    return {};
  }

  try {
    const payload = JSON.parse(bodyText) as DailyBriefRetryDeliveryRequestBody;

    if (
      payload.runDate !== undefined &&
      (typeof payload.runDate !== "string" || !isValidRunDate(payload.runDate))
    ) {
      return badRequest("runDate must use YYYY-MM-DD format.");
    }

    return payload;
  } catch {
    return badRequest("Request body must be valid JSON.");
  }
}

export async function POST(request: Request) {
  if (!isDailyBriefSchedulerConfigured()) {
    return serviceUnavailable(
      `Daily brief scheduler is not configured yet. Set ${getDailyBriefSchedulerHeaderName()} support first.`,
    );
  }

  if (!hasValidDailyBriefSchedulerSecret(request)) {
    return unauthorized(
      "Please provide the daily brief scheduler secret to run this route.",
    );
  }

  const parsedBody = await parseRequestBody(request);

  if (parsedBody instanceof Response) {
    return parsedBody;
  }

  const runDate = parsedBody.runDate ?? buildRunDate();
  const retryAttemptTimestamp = buildRetryAttemptTimestamp(runDate);
  const history = await listDailyBriefHistory({
    scheduledFor: runDate,
  });
  const retryCandidates = history.filter((entry) =>
    isRetryCandidate(entry, retryAttemptTimestamp)
  );
  const eligibleProfiles = await listEligibleDeliveryProfiles();
  let retriedCount = 0;
  let deliveryAttemptCount = 0;
  let deliverySuccessCount = 0;
  let deliveryFailureCount = 0;
  let targetedProfileCount = 0;
  let skippedProfileCount = 0;
  const dispatchMode = planDailyBriefDispatch([]).mode;

  for (const brief of retryCandidates) {
    const failedParentIds = new Set(
      brief.failedDeliveryTargets.map((target) => target.parentId),
    );
    const eligibleProgrammeProfiles = eligibleProfiles.filter(
      (profile) =>
        profile.student.programme === brief.programme &&
        failedParentIds.has(profile.parent.id),
    );
    const dispatchPlan = planDailyBriefDispatch(eligibleProgrammeProfiles);
    const programmeProfiles = dispatchPlan.selectedProfiles;
    const dispatchContext =
      dispatchPlan.mode === "canary"
        ? `Retry mode: canary. Targeted ${programmeProfiles.length} of ${eligibleProgrammeProfiles.length} failed profile(s).`
        : `Retry mode: all. Targeted ${programmeProfiles.length} failed profile(s).`;

    targetedProfileCount += programmeProfiles.length;
    skippedProfileCount += dispatchPlan.skippedProfiles.length;

    if (programmeProfiles.length === 0) {
      await emitDailyBriefOpsAlert({
        stage: "retry-delivery",
        severity: "warning",
        runDate,
        title: "Daily brief retry skipped",
        message:
          dispatchPlan.mode === "canary"
            ? "Retry delivery found failed targets but none matched the current canary allowlist."
            : "Retry delivery found no eligible failed profiles to retry.",
        details: {
          programme: brief.programme,
          dispatchMode: dispatchPlan.mode,
          failedTargetCount: brief.failedDeliveryTargets.length,
          targetedProfileCount: programmeProfiles.length,
          skippedProfileCount: dispatchPlan.skippedProfiles.length,
        },
      });
      continue;
    }

    const retrySummary = await deliverHistoryBriefToProfiles(programmeProfiles, brief, {
      retryTargets: brief.failedDeliveryTargets,
    });
    const nextDeliveryAttemptCount =
      brief.deliveryAttemptCount + retrySummary.deliveryAttemptCount;
    const nextDeliverySuccessCount =
      brief.deliverySuccessCount + retrySummary.deliverySuccessCount;
    const nextDeliveryFailureCount =
      brief.deliveryFailureCount + retrySummary.deliveryFailureCount;
    const retriedParentIds = new Set(
      programmeProfiles.map((profile) => profile.parent.id),
    );
    const untouchedFailedTargets = brief.failedDeliveryTargets.filter(
      (target) => !retriedParentIds.has(target.parentId),
    );
    const remainingFailedTargets = [
      ...untouchedFailedTargets,
      ...retrySummary.failedDeliveryTargets,
    ];
    const hasRemainingFailures = remainingFailedTargets.length > 0;
    const hasAnySuccess = nextDeliverySuccessCount > 0;

    retriedCount += 1;
    deliveryAttemptCount += retrySummary.deliveryAttemptCount;
    deliverySuccessCount += retrySummary.deliverySuccessCount;
    deliveryFailureCount += retrySummary.deliveryFailureCount;

    await updateDailyBriefHistoryEntry(brief.id, {
      status: hasRemainingFailures && !hasAnySuccess ? "failed" : "published",
      pipelineStage: hasRemainingFailures && !hasAnySuccess ? "failed" : "published",
      lastDeliveryAttemptAt: retryAttemptTimestamp,
      deliveryAttemptCount: nextDeliveryAttemptCount,
      deliverySuccessCount: nextDeliverySuccessCount,
      deliveryFailureCount: nextDeliveryFailureCount,
      failedDeliveryTargets: remainingFailedTargets,
      retryEligibleUntil: hasRemainingFailures ? brief.retryEligibleUntil : null,
      failureReason: hasRemainingFailures
        ? hasAnySuccess
          ? `${remainingFailedTargets.length} delivery target(s) still need retry.`
          : "All configured delivery attempts failed."
        : "",
      adminNotes: appendAdminNotes(
        brief.adminNotes,
        `${dispatchContext} Retry attempts: ${retrySummary.deliveryAttemptCount}. Successful retries: ${retrySummary.deliverySuccessCount}. Failed retries: ${retrySummary.deliveryFailureCount}.`,
      ),
    });

    if (hasRemainingFailures) {
      await emitDailyBriefOpsAlert({
        stage: "retry-delivery",
        severity: hasAnySuccess ? "warning" : "critical",
        runDate,
        title: hasAnySuccess
          ? "Daily brief retry completed with remaining failures"
          : "Daily brief retry exhausted without success",
        message: hasAnySuccess
          ? `${remainingFailedTargets.length} delivery target(s) still need operator follow-up after retry.`
          : "All configured retry deliveries failed.",
        details: {
          programme: brief.programme,
          dispatchMode: dispatchPlan.mode,
          targetedProfileCount: programmeProfiles.length,
          skippedProfileCount: dispatchPlan.skippedProfiles.length,
          deliveryAttemptCount: retrySummary.deliveryAttemptCount,
          deliverySuccessCount: retrySummary.deliverySuccessCount,
          deliveryFailureCount: retrySummary.deliveryFailureCount,
        },
      });
    }
  }

  return Response.json({
    mode: "retry-delivery",
    runDate,
    summary: {
      dispatchMode,
      targetedProfileCount,
      skippedProfileCount,
      historyEntryCount: history.length,
      retryCandidateCount: retryCandidates.length,
      retriedCount,
      deliveryAttemptCount,
      deliverySuccessCount,
      deliveryFailureCount,
    },
  });
}
