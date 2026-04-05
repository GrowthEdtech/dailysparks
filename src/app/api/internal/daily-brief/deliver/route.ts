import {
  listDailyBriefHistory,
  updateDailyBriefHistoryEntry,
} from "../../../../../lib/daily-brief-history-store";
import {
  DAILY_BRIEF_RECORD_KINDS,
  type DailyBriefHistoryRecord,
  type DailyBriefRecordKind,
} from "../../../../../lib/daily-brief-history-schema";
import {
  DAILY_BRIEF_DISPATCH_MODES,
  type DailyBriefDispatchMode,
  planDailyBriefDispatch,
} from "../../../../../lib/daily-brief-delivery-policy";
import {
  buildEditorialCohortEvaluationDate,
  filterProfilesByEditorialCohort,
} from "../../../../../lib/daily-brief-cohorts";
import { emitDailyBriefOpsAlert } from "../../../../../lib/daily-brief-ops-alerts";
import { listPendingDeliveryTargets } from "../../../../../lib/daily-brief-delivery-progress";
import { deliverHistoryBriefToProfiles } from "../../../../../lib/daily-brief-stage-delivery";
import { hasAutomatedDeliverySubscription } from "../../../../../lib/delivery-eligibility";
import {
  DAILY_BRIEF_PDF_RENDERERS,
  type DailyBriefPdfRenderer,
} from "../../../../../lib/goodnotes-delivery";
import {
  buildProfileLocalDeliveryWindowLabel,
  splitProfilesByDeliveryWindow,
} from "../../../../../lib/delivery-window";
import {
  getDailyBriefSchedulerHeaderName,
  hasValidDailyBriefSchedulerSecret,
  isDailyBriefSchedulerConfigured,
} from "../../../../../lib/daily-brief-run-auth";
import { getDailyBriefDispatchRunDates } from "../../../../../lib/daily-brief-run-date";
import {
  listDispatchableDeliveryProfiles,
  listParentProfiles,
} from "../../../../../lib/mvp-store";

type DailyBriefDeliverRequestBody = {
  runDate?: string;
  recordKind?: string;
  dispatchMode?: string;
  canaryParentEmails?: string[];
  dispatchTimestamp?: string;
  forceDispatch?: boolean;
  renderer?: string;
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

function buildRetryEligibleUntil(dispatchTimestamp: string) {
  const parsed = Date.parse(dispatchTimestamp);

  if (Number.isNaN(parsed)) {
    return null;
  }

  return new Date(parsed + 30 * 60 * 1000).toISOString();
}

function normalizeDispatchMode(value: unknown): DailyBriefDispatchMode | undefined {
  return typeof value === "string" &&
    (DAILY_BRIEF_DISPATCH_MODES as readonly string[]).includes(value)
    ? (value as DailyBriefDispatchMode)
    : undefined;
}

function normalizeRecordKind(value: unknown): DailyBriefRecordKind | undefined {
  return typeof value === "string" &&
    DAILY_BRIEF_RECORD_KINDS.includes(value as DailyBriefRecordKind)
    ? (value as DailyBriefRecordKind)
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

function normalizeDispatchTimestamp(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  return Number.isNaN(Date.parse(value)) ? undefined : new Date(value).toISOString();
}

function normalizeRenderer(value: unknown): DailyBriefPdfRenderer | undefined {
  return typeof value === "string" &&
      (DAILY_BRIEF_PDF_RENDERERS as readonly string[]).includes(value)
    ? (value as DailyBriefPdfRenderer)
    : undefined;
}

function isDeliverableBrief(entry: DailyBriefHistoryRecord) {
  return (
    entry.status === "approved" &&
    (entry.pipelineStage === "preflight_passed" ||
      entry.pipelineStage === "delivering")
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

function buildDispatchAudienceProfiles(
  profiles: Awaited<ReturnType<typeof listParentProfiles>>,
  reason: string,
) {
  return profiles.map((profile) => ({
    parentId: profile.parent.id,
    parentEmail: profile.parent.email,
    localDeliveryWindow: buildProfileLocalDeliveryWindowLabel(profile),
    reason,
  }));
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

    if (
      payload.recordKind !== undefined &&
      normalizeRecordKind(payload.recordKind) === undefined
    ) {
      return badRequest("recordKind must be production or test when provided.");
    }

    if (
      payload.dispatchTimestamp !== undefined &&
      normalizeDispatchTimestamp(payload.dispatchTimestamp) === undefined
    ) {
      return badRequest("dispatchTimestamp must be a valid ISO timestamp.");
    }

    if (
      payload.renderer !== undefined &&
      normalizeRenderer(payload.renderer) === undefined
    ) {
      return badRequest("renderer must be pdf-lib or typst when provided.");
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

  const dispatchTimestamp =
    normalizeDispatchTimestamp(parsedBody.dispatchTimestamp) ??
    new Date().toISOString();
  const renderer = normalizeRenderer(parsedBody.renderer) ?? "pdf-lib";
  const resolvedDispatchDate = new Date(dispatchTimestamp);
  const runDatesProcessed = parsedBody.runDate
    ? [parsedBody.runDate]
    : getDailyBriefDispatchRunDates(resolvedDispatchDate);
  const recordKind = normalizeRecordKind(parsedBody.recordKind) ?? "production";
  const forceDispatch = parsedBody.forceDispatch === true;
  const dispatchOverrides = {
    mode: normalizeDispatchMode(parsedBody.dispatchMode),
    canaryParentEmails: normalizeCanaryParentEmails(
      parsedBody.canaryParentEmails,
    ),
  };
  const history = (
    await Promise.all(
      runDatesProcessed.map((scheduledFor) =>
        listDailyBriefHistory({
          scheduledFor,
          recordKind,
        }),
      ),
    )
  ).flat();
  const deliverableBriefs = history.filter(isDeliverableBrief);
  const dispatchableProfiles = await listDispatchableDeliveryProfiles();
  const allProfiles = await listParentProfiles();
  const retryEligibleUntil = buildRetryEligibleUntil(dispatchTimestamp);
  let deliveredCount = 0;
  let failedCount = 0;
  let deliveryAttemptCount = 0;
  let deliverySuccessCount = 0;
  let deliveryFailureCount = 0;
  let targetedProfileCount = 0;
  let skippedProfileCount = 0;
  let pendingFutureProfileCount = 0;

  const dispatchMode = planDailyBriefDispatch([], dispatchOverrides).mode;

  for (const brief of deliverableBriefs) {
    const cohortEvaluationDate = buildEditorialCohortEvaluationDate(
      brief.scheduledFor,
    );
    const activeProgrammeProfiles = filterProfilesByEditorialCohort(
      allProfiles,
      brief.editorialCohort,
      cohortEvaluationDate,
    ).filter(
      (profile) =>
        profile.student.programme === brief.programme &&
        hasAutomatedDeliverySubscription(profile.parent),
    );
    const eligibleProgrammeProfiles = filterProfilesByEditorialCohort(
      dispatchableProfiles,
      brief.editorialCohort,
      cohortEvaluationDate,
    ).filter(
      (profile) => profile.student.programme === brief.programme,
    );
    const deliveryWindowSplit = forceDispatch
      ? {
          dueProfiles: eligibleProgrammeProfiles,
          pendingProfiles: [],
        }
      : splitProfilesByDeliveryWindow({
          profiles: eligibleProgrammeProfiles,
          runDate: brief.scheduledFor,
          dispatchTimestamp,
        });
    const dispatchPlan = planDailyBriefDispatch(
      deliveryWindowSplit.dueProfiles,
      dispatchOverrides,
    );
    const programmeProfiles = dispatchPlan.selectedProfiles;
    const targetedProfiles = buildDispatchAudienceProfiles(
      programmeProfiles,
      dispatchPlan.mode === "canary"
        ? "Selected for the current canary delivery wave."
        : "Selected for the current delivery wave.",
    );
    const skippedProfiles = buildDispatchAudienceProfiles(
      dispatchPlan.skippedProfiles,
      "Skipped by canary mode for this delivery wave.",
    );
    const pendingFutureProfiles = buildDispatchAudienceProfiles(
      deliveryWindowSplit.pendingProfiles,
      "Pending future local delivery window.",
    );
    const heldProfiles = buildDispatchAudienceProfiles(
      activeProgrammeProfiles.filter(
        (profile) =>
          !eligibleProgrammeProfiles.some(
            (eligibleProfile) => eligibleProfile.parent.id === profile.parent.id,
          ),
      ),
      "No healthy delivery channel was available for this wave.",
    );
    const dispatchContext =
      dispatchPlan.mode === "canary"
        ? `Dispatch mode: canary. Targeted ${programmeProfiles.length} of ${eligibleProgrammeProfiles.length} eligible profile(s) in this local-time wave.`
        : `Dispatch mode: all. Targeted ${programmeProfiles.length} eligible profile(s) in this local-time wave.`;

    targetedProfileCount += programmeProfiles.length;
    skippedProfileCount += dispatchPlan.skippedProfiles.length;
    pendingFutureProfileCount += deliveryWindowSplit.pendingProfiles.length;

    if (activeProgrammeProfiles.length === 0) {
      const failureReason =
        "No active delivery profiles remained for this programme.";

      await updateDailyBriefHistoryEntry(brief.id, {
        status: "failed",
        pipelineStage: "failed",
        lastDeliveryAttemptAt: dispatchTimestamp,
        dispatchMode: dispatchPlan.mode,
        dispatchCanaryParentEmails: dispatchPlan.canaryParentEmails,
        targetedProfiles,
        skippedProfiles,
        pendingFutureProfiles,
        heldProfiles,
        failureReason,
        deliveryFailureCount: brief.deliveryFailureCount,
        failedDeliveryTargets: [],
        retryEligibleUntil: null,
        adminNotes: appendAdminNotes(brief.adminNotes, dispatchContext),
      });
      await emitDailyBriefOpsAlert({
        stage: "deliver",
        severity: "critical",
        runDate: brief.scheduledFor,
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

    if (eligibleProgrammeProfiles.length === 0) {
      await updateDailyBriefHistoryEntry(brief.id, {
        dispatchMode: dispatchPlan.mode,
        dispatchCanaryParentEmails: dispatchPlan.canaryParentEmails,
        targetedProfiles,
        skippedProfiles,
        pendingFutureProfiles,
        heldProfiles,
        adminNotes: appendAdminNotes(
          brief.adminNotes,
          "No dispatchable delivery channels were healthy for this programme in the current wave. The brief stayed ready for a later recovery dispatch.",
        ),
      });
      await emitDailyBriefOpsAlert({
        stage: "deliver",
        severity: "warning",
        runDate: brief.scheduledFor,
        title: "Daily brief held for channel recovery",
        message:
          "Active families still exist in this programme, but none currently have a healthy dispatchable delivery channel.",
        details: {
          programme: brief.programme,
          activeProfileCount: activeProgrammeProfiles.length,
          dispatchableProfileCount: eligibleProgrammeProfiles.length,
        },
      });
      continue;
    }

    if (deliveryWindowSplit.dueProfiles.length === 0) {
      await updateDailyBriefHistoryEntry(brief.id, {
        dispatchMode: dispatchPlan.mode,
        dispatchCanaryParentEmails: dispatchPlan.canaryParentEmails,
        targetedProfiles,
        skippedProfiles,
        pendingFutureProfiles,
        heldProfiles,
      });
      continue;
    }

    if (programmeProfiles.length === 0) {
      await updateDailyBriefHistoryEntry(brief.id, {
        dispatchMode: dispatchPlan.mode,
        dispatchCanaryParentEmails: dispatchPlan.canaryParentEmails,
        targetedProfiles,
        skippedProfiles,
        pendingFutureProfiles,
        heldProfiles,
        adminNotes: appendAdminNotes(
          brief.adminNotes,
          `${dispatchContext} No canary delivery profiles matched this programme, so the brief stayed ready for a later full dispatch.`,
        ),
      });
      await emitDailyBriefOpsAlert({
        stage: "deliver",
        severity: "info",
        runDate: brief.scheduledFor,
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
        successfulReceipts: brief.deliveryReceipts,
        blockedTargets: brief.failedDeliveryTargets,
        attachmentMode: dispatchPlan.mode === "canary" ? "canary" : "production",
        renderer,
      },
    );
    const nextDeliveryReceipts = [
      ...brief.deliveryReceipts,
      ...deliverySummary.deliveryReceipts,
    ];
    const nextFailedDeliveryTargets = [
      ...brief.failedDeliveryTargets,
      ...deliverySummary.failedDeliveryTargets,
    ];
    const nextDeliveryAttemptCount =
      brief.deliveryAttemptCount + deliverySummary.deliveryAttemptCount;
    const nextDeliverySuccessCount =
      brief.deliverySuccessCount + deliverySummary.deliverySuccessCount;
    const nextDeliveryFailureCount =
      brief.deliveryFailureCount + deliverySummary.deliveryFailureCount;
    const hasFailures = nextFailedDeliveryTargets.length > 0;
    const hasAnySuccess = nextDeliverySuccessCount > 0;
    const pendingTargets = listPendingDeliveryTargets({
      profiles:
        dispatchPlan.mode === "canary"
          ? dispatchPlan.selectedProfiles
          : eligibleProgrammeProfiles,
      deliveryReceipts: nextDeliveryReceipts,
      failedDeliveryTargets: nextFailedDeliveryTargets,
    });
    const hasPendingTargets = pendingTargets.length > 0;

    deliveryAttemptCount += deliverySummary.deliveryAttemptCount;
    deliverySuccessCount += deliverySummary.deliverySuccessCount;
    deliveryFailureCount += deliverySummary.deliveryFailureCount;

    if (hasAnySuccess) {
      deliveredCount += 1;
    } else {
      failedCount += 1;
    }

    await updateDailyBriefHistoryEntry(brief.id, {
      status: hasPendingTargets
        ? "approved"
        : hasFailures && !hasAnySuccess
          ? "failed"
          : "published",
      pipelineStage: hasPendingTargets
        ? "delivering"
        : hasFailures && !hasAnySuccess
          ? "failed"
          : "published",
      lastDeliveryAttemptAt: dispatchTimestamp,
      deliveryAttemptCount: nextDeliveryAttemptCount,
      deliverySuccessCount: nextDeliverySuccessCount,
      deliveryFailureCount: nextDeliveryFailureCount,
      dispatchMode: dispatchPlan.mode,
      dispatchCanaryParentEmails: dispatchPlan.canaryParentEmails,
      targetedProfiles,
      skippedProfiles,
      pendingFutureProfiles,
      heldProfiles,
      deliveryReceipts: nextDeliveryReceipts,
      failedDeliveryTargets: nextFailedDeliveryTargets,
      retryEligibleUntil: hasFailures ? retryEligibleUntil : null,
      failureReason: hasFailures
        ? hasAnySuccess
          ? hasPendingTargets
            ? `${nextFailedDeliveryTargets.length} delivery target(s) need retry while later local delivery windows remain pending.`
            : `${nextFailedDeliveryTargets.length} delivery target(s) need retry.`
          : "All configured delivery attempts failed."
        : hasPendingTargets
          ? `${pendingTargets.length} delivery target(s) remain in future local windows.`
          : "",
      adminNotes: appendAdminNotes(
        brief.adminNotes,
        `${dispatchContext} Delivery attempts: ${deliverySummary.deliveryAttemptCount}. Successful deliveries: ${deliverySummary.deliverySuccessCount}. Failed deliveries: ${deliverySummary.deliveryFailureCount}. Pending future targets: ${pendingTargets.length}.`,
      ),
    });

    if (hasFailures) {
      await emitDailyBriefOpsAlert({
        stage: "deliver",
        severity: hasAnySuccess ? "warning" : "critical",
        runDate: brief.scheduledFor,
        title: hasAnySuccess
          ? "Daily brief delivery completed with retry-needed failures"
          : "Daily brief delivery failed",
        message: hasAnySuccess
          ? `${deliverySummary.failedDeliveryTargets.length} delivery target(s) need retry after the current local-time delivery wave.`
          : "All configured delivery attempts failed during the current local-time delivery wave.",
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
    runDate: runDatesProcessed[0],
    runDatesProcessed,
    recordKind,
    summary: {
      dispatchMode,
      targetedProfileCount,
      skippedProfileCount,
      pendingFutureProfileCount,
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
