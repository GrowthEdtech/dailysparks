import { getDailyBriefCanaryParentEmails } from "./daily-brief-delivery-policy";
import type {
  DailyBriefDeliveryReceipt,
  DailyBriefFailedDeliveryTarget,
  DailyBriefHistoryRecord,
  DailyBriefSyntheticCanaryState,
} from "./daily-brief-history-schema";
import type { DailyBriefPdfRenderer } from "./goodnotes-delivery";
import { deliverHistoryBriefToProfiles } from "./daily-brief-stage-delivery";
import type { ParentProfile } from "./mvp-types";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function dedupeEmails(emails: string[]) {
  return [...new Set(emails.map((email) => normalizeEmail(email)).filter(Boolean))];
}

function buildFailedTargetsReason(
  failedTargets: DailyBriefFailedDeliveryTarget[],
) {
  if (failedTargets.length === 0) {
    return "";
  }

  if (failedTargets.length === 1) {
    const target = failedTargets[0];

    return target
      ? `${target.parentEmail} (${target.channel}) failed: ${target.errorMessage}`
      : "";
  }

  return `${failedTargets.length} synthetic canary targets failed after one automatic retry.`;
}

function buildBaseState(
  previousState: DailyBriefSyntheticCanaryState | null | undefined,
  targetParentEmails: string[],
): DailyBriefSyntheticCanaryState {
  return {
    status: previousState?.status ?? "pending",
    targetParentEmails,
    attemptCount: previousState?.attemptCount ?? 0,
    successCount: previousState?.successCount ?? 0,
    failureCount: previousState?.failureCount ?? 0,
    autoRetryCount: previousState?.autoRetryCount ?? 0,
    lastAttemptAt: previousState?.lastAttemptAt ?? null,
    lastPassedAt: previousState?.lastPassedAt ?? null,
    blockedAt: previousState?.blockedAt ?? null,
    releasedAt: previousState?.releasedAt ?? null,
    releasedBy: previousState?.releasedBy ?? null,
    releaseReason: previousState?.releaseReason ?? "",
    lastFailureReason: previousState?.lastFailureReason ?? "",
    lastFailedTargets: previousState?.lastFailedTargets ?? [],
    lastDeliveryReceipts: previousState?.lastDeliveryReceipts ?? [],
    renderAudit: previousState?.renderAudit ?? null,
  };
}

export function isDailyBriefSyntheticCanaryEnabled() {
  return process.env.DAILY_BRIEF_SYNTHETIC_CANARY_ENABLED !== "false";
}

export function getDailyBriefSyntheticCanaryParentEmails() {
  const configured = dedupeEmails(
    (process.env.DAILY_BRIEF_SYNTHETIC_CANARY_PARENT_EMAILS ?? "").split(","),
  );

  if (configured.length > 0) {
    return configured;
  }

  const dispatchFallback = getDailyBriefCanaryParentEmails();

  if (dispatchFallback.length > 0) {
    return dedupeEmails(dispatchFallback);
  }

  return ["admin@geledtech.com"];
}

export function releaseDailyBriefSyntheticCanaryState(input: {
  previousState: DailyBriefSyntheticCanaryState | null | undefined;
  releasedAt: string;
  releasedBy: string;
  releaseReason: string;
}) {
  const nextState = buildBaseState(
    input.previousState,
    input.previousState?.targetParentEmails ?? getDailyBriefSyntheticCanaryParentEmails(),
  );

  return {
    ...nextState,
    status: "released" as const,
    releasedAt: input.releasedAt,
    releasedBy: input.releasedBy.trim() || "editorial-admin",
    releaseReason: input.releaseReason.trim(),
  };
}

export async function runDailyBriefSyntheticCanary(input: {
  brief: DailyBriefHistoryRecord;
  dispatchableProfiles: ParentProfile[];
  renderer: DailyBriefPdfRenderer;
  attemptTimestamp: string;
  targetParentEmails?: string[];
  previousState?: DailyBriefSyntheticCanaryState | null;
}) {
  const targetParentEmails = dedupeEmails(
    input.targetParentEmails?.length
      ? input.targetParentEmails
      : getDailyBriefSyntheticCanaryParentEmails(),
  );
  const nextState = buildBaseState(input.previousState, targetParentEmails);
  const dispatchableProfileMap = new Map(
    input.dispatchableProfiles.map((profile) => [
      normalizeEmail(profile.parent.email),
      profile,
    ]),
  );
  const healthyProfiles = targetParentEmails
    .map((email) => dispatchableProfileMap.get(email))
    .filter((profile): profile is ParentProfile => Boolean(profile));

  if (healthyProfiles.length === 0) {
    return {
      passed: false,
      state: {
        ...nextState,
        status: "blocked" as const,
        attemptCount: nextState.attemptCount + 1,
        failureCount: nextState.failureCount + 1,
        lastAttemptAt: input.attemptTimestamp,
        blockedAt: input.attemptTimestamp,
        lastFailureReason:
          "No healthy synthetic canary recipients are configured for this brief.",
        lastFailedTargets: [],
        lastDeliveryReceipts: [],
      },
    };
  }

  const firstAttempt = await deliverHistoryBriefToProfiles(
    healthyProfiles,
    input.brief,
    {
      attachmentMode: "canary",
      renderer: input.renderer,
    },
  );
  const firstAttemptPassed =
    firstAttempt.failedDeliveryTargets.length === 0 &&
    firstAttempt.deliverySuccessCount === healthyProfiles.length;

  if (firstAttemptPassed) {
    return {
      passed: true,
      state: {
        ...nextState,
        status: "passed" as const,
        attemptCount: nextState.attemptCount + firstAttempt.deliveryAttemptCount,
        successCount: nextState.successCount + firstAttempt.deliverySuccessCount,
        failureCount: nextState.failureCount + firstAttempt.deliveryFailureCount,
        lastAttemptAt: input.attemptTimestamp,
        lastPassedAt: input.attemptTimestamp,
        blockedAt: null,
        releasedAt: null,
        releasedBy: null,
        releaseReason: "",
        lastFailureReason: "",
        lastFailedTargets: [],
        lastDeliveryReceipts: firstAttempt.deliveryReceipts,
        renderAudit: firstAttempt.renderAudit ?? nextState.renderAudit,
      },
    };
  }

  const secondAttempt = await deliverHistoryBriefToProfiles(
    healthyProfiles,
    input.brief,
    {
      retryTargets: firstAttempt.failedDeliveryTargets,
      successfulReceipts: firstAttempt.deliveryReceipts,
      attachmentMode: "canary",
      renderer: input.renderer,
    },
  );
  const combinedReceipts: DailyBriefDeliveryReceipt[] = [
    ...firstAttempt.deliveryReceipts,
    ...secondAttempt.deliveryReceipts,
  ];
  const combinedFailedTargets = secondAttempt.failedDeliveryTargets;
  const combinedAttemptCount =
    firstAttempt.deliveryAttemptCount + secondAttempt.deliveryAttemptCount;
  const combinedSuccessCount =
    firstAttempt.deliverySuccessCount + secondAttempt.deliverySuccessCount;
  const combinedFailureCount =
    firstAttempt.deliveryFailureCount + secondAttempt.deliveryFailureCount;
  const passedAfterRetry =
    combinedFailedTargets.length === 0 &&
    combinedSuccessCount === healthyProfiles.length;

  if (passedAfterRetry) {
    return {
      passed: true,
      state: {
        ...nextState,
        status: "passed" as const,
        attemptCount: nextState.attemptCount + combinedAttemptCount,
        successCount: nextState.successCount + combinedSuccessCount,
        failureCount: nextState.failureCount + combinedFailureCount,
        autoRetryCount: nextState.autoRetryCount + 1,
        lastAttemptAt: input.attemptTimestamp,
        lastPassedAt: input.attemptTimestamp,
        blockedAt: null,
        releasedAt: null,
        releasedBy: null,
        releaseReason: "",
        lastFailureReason: "",
        lastFailedTargets: [],
        lastDeliveryReceipts: combinedReceipts,
        renderAudit:
          secondAttempt.renderAudit ??
          firstAttempt.renderAudit ??
          nextState.renderAudit,
      },
    };
  }

  return {
    passed: false,
    state: {
      ...nextState,
      status: "blocked" as const,
      attemptCount: nextState.attemptCount + combinedAttemptCount,
      successCount: nextState.successCount + combinedSuccessCount,
      failureCount: nextState.failureCount + combinedFailureCount,
      autoRetryCount: nextState.autoRetryCount + 1,
      lastAttemptAt: input.attemptTimestamp,
      blockedAt: input.attemptTimestamp,
      lastFailureReason:
        buildFailedTargetsReason(combinedFailedTargets) ||
        "Synthetic canary delivery failed after one automatic retry.",
      lastFailedTargets: combinedFailedTargets,
      lastDeliveryReceipts: combinedReceipts,
      renderAudit:
        secondAttempt.renderAudit ??
        firstAttempt.renderAudit ??
        nextState.renderAudit,
    },
  };
}
