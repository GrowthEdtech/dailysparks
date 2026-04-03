import {
  listDailyBriefHistory,
  updateDailyBriefHistoryEntry,
} from "../../../../../lib/daily-brief-history-store";
import type { DailyBriefHistoryRecord } from "../../../../../lib/daily-brief-history-schema";
import {
  DAILY_BRIEF_DISPATCH_MODES,
  type DailyBriefDispatchMode,
  planDailyBriefDispatch,
} from "../../../../../lib/daily-brief-delivery-policy";
import { emitDailyBriefOpsAlert } from "../../../../../lib/daily-brief-ops-alerts";
import { deliverHistoryBriefToProfiles } from "../../../../../lib/daily-brief-stage-delivery";
import {
  getDailyBriefSchedulerHeaderName,
  hasValidDailyBriefSchedulerSecret,
  isDailyBriefSchedulerConfigured,
} from "../../../../../lib/daily-brief-run-auth";
import { getDailyBriefBusinessDate } from "../../../../../lib/daily-brief-run-date";
import { listEligibleDeliveryProfiles } from "../../../../../lib/mvp-store";

type DailyBriefDeliverRequestBody = {
  runDate?: string;
  dispatchMode?: string;
  canaryParentEmails?: string[];
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

function isValidRunDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}

function buildDispatchTimestamp(runDate: string) {
  const parsed = Date.parse(`${runDate}T09:00:00+08:00`);

  return Number.isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString();
}

function buildRetryEligibleUntil(runDate: string) {
  const parsed = Date.parse(`${runDate}T09:30:00+08:00`);

  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

function normalizeDispatchMode(value: unknown): DailyBriefDispatchMode | undefined {
  return typeof value === "string" &&
    (DAILY_BRIEF_DISPATCH_MODES as readonly string[]).includes(value)
    ? (value as DailyBriefDispatchMode)
    : undefined;
}

function normalizeCanaryParentEmails(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function isDeliverableBrief(entry: DailyBriefHistoryRecord) {
  return entry.status === "approved" && entry.pipelineStage === "preflight_passed";
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
): Promise<DailyBriefDeliverRequestBody | Response> {
  const contentLength = request.headers.get("content-length");

  if (contentLength === "0") {
    return {};
  }

  const bodyText = await request.text();

  if (!bodyText.trim()) {
    return {};
  }

  try {
    const payload = JSON.parse(bodyText) as DailyBriefDeliverRequestBody;

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

  const runDate = parsedBody.runDate ?? getDailyBriefBusinessDate();
  const dispatchOverrides = {
    mode: normalizeDispatchMode(parsedBody.dispatchMode),
    canaryParentEmails: normalizeCanaryParentEmails(
      parsedBody.canaryParentEmails,
    ),
  };
  const history = await listDailyBriefHistory({
    scheduledFor: runDate,
  });
  const deliverableBriefs = history.filter(isDeliverableBrief);
  const eligibleProfiles = await listEligibleDeliveryProfiles();
  const dispatchTimestamp = buildDispatchTimestamp(runDate);
  const retryEligibleUntil = buildRetryEligibleUntil(runDate);
  let deliveredCount = 0;
  let failedCount = 0;
  let deliveryAttemptCount = 0;
  let deliverySuccessCount = 0;
  let deliveryFailureCount = 0;
  let targetedProfileCount = 0;
  let skippedProfileCount = 0;

  const dispatchMode = planDailyBriefDispatch([], dispatchOverrides).mode;

  for (const brief of deliverableBriefs) {
    const eligibleProgrammeProfiles = eligibleProfiles.filter(
      (profile) => profile.student.programme === brief.programme,
    );
    const dispatchPlan = planDailyBriefDispatch(
      eligibleProgrammeProfiles,
      dispatchOverrides,
    );
    const programmeProfiles = dispatchPlan.selectedProfiles;
    const dispatchContext =
      dispatchPlan.mode === "canary"
        ? `Dispatch mode: canary. Targeted ${programmeProfiles.length} of ${eligibleProgrammeProfiles.length} eligible profile(s).`
        : `Dispatch mode: all. Targeted ${programmeProfiles.length} eligible profile(s).`;

    targetedProfileCount += programmeProfiles.length;
    skippedProfileCount += dispatchPlan.skippedProfiles.length;

    if (eligibleProgrammeProfiles.length === 0) {
      const failureReason =
        "No eligible delivery profiles were ready for this programme.";

      await updateDailyBriefHistoryEntry(brief.id, {
        status: "failed",
        pipelineStage: "failed",
        lastDeliveryAttemptAt: dispatchTimestamp,
        failureReason,
        deliveryFailureCount: brief.deliveryFailureCount,
        failedDeliveryTargets: [],
        retryEligibleUntil: null,
        adminNotes: appendAdminNotes(brief.adminNotes, dispatchContext),
      });
      await emitDailyBriefOpsAlert({
        stage: "deliver",
        severity: "critical",
        runDate,
        title: "Daily brief delivery blocked",
        message: failureReason,
        details: {
          programme: brief.programme,
          dispatchMode: dispatchPlan.mode,
          eligibleProfileCount: eligibleProgrammeProfiles.length,
          targetedProfileCount: programmeProfiles.length,
          skippedProfileCount: dispatchPlan.skippedProfiles.length,
        },
      });
      failedCount += 1;
      continue;
    }

    if (programmeProfiles.length === 0) {
      await updateDailyBriefHistoryEntry(brief.id, {
        adminNotes: appendAdminNotes(
          brief.adminNotes,
          `${dispatchContext} No canary delivery profiles matched this programme, so the brief stayed ready for a later full dispatch.`,
        ),
      });
      await emitDailyBriefOpsAlert({
        stage: "deliver",
        severity: "info",
        runDate,
        title: "Daily brief skipped for canary dispatch",
        message:
          "A deliverable brief stayed in the ready queue because the current canary allowlist had no recipients for this programme.",
        details: {
          programme: brief.programme,
          dispatchMode: dispatchPlan.mode,
          eligibleProfileCount: eligibleProgrammeProfiles.length,
          targetedProfileCount: 0,
          skippedProfileCount: dispatchPlan.skippedProfiles.length,
        },
      });
      continue;
    }

    const deliverySummary = await deliverHistoryBriefToProfiles(
      programmeProfiles,
      brief,
      {
        attachmentMode: dispatchPlan.mode === "canary" ? "canary" : "production",
      },
    );
    const nextDeliveryAttemptCount =
      brief.deliveryAttemptCount + deliverySummary.deliveryAttemptCount;
    const nextDeliverySuccessCount =
      brief.deliverySuccessCount + deliverySummary.deliverySuccessCount;
    const nextDeliveryFailureCount =
      brief.deliveryFailureCount + deliverySummary.deliveryFailureCount;
    const hasFailures = deliverySummary.failedDeliveryTargets.length > 0;
    const hasAnySuccess = deliverySummary.deliverySuccessCount > 0;

    deliveryAttemptCount += deliverySummary.deliveryAttemptCount;
    deliverySuccessCount += deliverySummary.deliverySuccessCount;
    deliveryFailureCount += deliverySummary.deliveryFailureCount;

    if (hasAnySuccess) {
      deliveredCount += 1;
    } else {
      failedCount += 1;
    }

    await updateDailyBriefHistoryEntry(brief.id, {
      status: hasAnySuccess ? "published" : "failed",
      pipelineStage: hasAnySuccess ? "published" : "failed",
      lastDeliveryAttemptAt: dispatchTimestamp,
      deliveryAttemptCount: nextDeliveryAttemptCount,
      deliverySuccessCount: nextDeliverySuccessCount,
      deliveryFailureCount: nextDeliveryFailureCount,
      deliveryReceipts: [
        ...brief.deliveryReceipts,
        ...deliverySummary.deliveryReceipts,
      ],
      failedDeliveryTargets: deliverySummary.failedDeliveryTargets,
      retryEligibleUntil: hasFailures ? retryEligibleUntil : null,
      failureReason: hasFailures
        ? hasAnySuccess
          ? `${deliverySummary.failedDeliveryTargets.length} delivery target(s) need retry.`
          : "All configured delivery attempts failed."
        : "",
      adminNotes: appendAdminNotes(
        brief.adminNotes,
        `${dispatchContext} Delivery attempts: ${deliverySummary.deliveryAttemptCount}. Successful deliveries: ${deliverySummary.deliverySuccessCount}. Failed deliveries: ${deliverySummary.deliveryFailureCount}.`,
      ),
    });

    if (hasFailures) {
      await emitDailyBriefOpsAlert({
        stage: "deliver",
        severity: hasAnySuccess ? "warning" : "critical",
        runDate,
        title: hasAnySuccess
          ? "Daily brief delivery completed with retry-needed failures"
          : "Daily brief delivery failed",
        message: hasAnySuccess
          ? `${deliverySummary.failedDeliveryTargets.length} delivery target(s) need retry after the 09:00 dispatch wave.`
          : "All configured delivery attempts failed during the 09:00 dispatch wave.",
        details: {
          programme: brief.programme,
          dispatchMode: dispatchPlan.mode,
          targetedProfileCount: programmeProfiles.length,
          skippedProfileCount: dispatchPlan.skippedProfiles.length,
          deliveryAttemptCount: deliverySummary.deliveryAttemptCount,
          deliverySuccessCount: deliverySummary.deliverySuccessCount,
          deliveryFailureCount: deliverySummary.deliveryFailureCount,
        },
      });
    }
  }

  return Response.json({
    mode: "deliver",
    runDate,
    summary: {
      dispatchMode,
      targetedProfileCount,
      skippedProfileCount,
      historyEntryCount: history.length,
      deliverableCount: deliverableBriefs.length,
      deliveredCount,
      failedCount,
      deliveryAttemptCount,
      deliverySuccessCount,
      deliveryFailureCount,
    },
  });
}
