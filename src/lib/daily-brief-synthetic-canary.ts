import { getDailyBriefCanaryParentEmails } from "./daily-brief-delivery-policy";
import { hasAutomatedDeliverySubscription } from "./delivery-eligibility";
import {
  getGoodnotesChannelReadiness,
  getNotionChannelReadiness,
  hasDispatchableDeliveryChannel,
} from "./delivery-readiness";
import type {
  DailyBriefDeliveryReceipt,
  DailyBriefFailedDeliveryTarget,
  DailyBriefHistoryRecord,
  DailyBriefSyntheticCanaryState,
  DailyBriefSyntheticCanaryUnhealthyTarget,
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

export type DailyBriefSyntheticCanaryHealthAssessment = {
  configuredParentEmails: string[];
  selectedParentEmail: string | null;
  selectedProfile: ParentProfile | null;
  healthyParentEmails: string[];
  unhealthyTargets: DailyBriefSyntheticCanaryUnhealthyTarget[];
  fallbackActivated: boolean;
  blocksProduction: boolean;
};

function buildUnhealthyTargetReason(profile: ParentProfile | null) {
  if (!profile) {
    return "No parent profile matched this email.";
  }

  if (!hasAutomatedDeliverySubscription(profile.parent)) {
    return "Profile does not currently have active or trial access.";
  }

  const goodnotes = getGoodnotesChannelReadiness(profile);
  const notion = getNotionChannelReadiness(profile);
  const channelIssues: string[] = [];

  if (goodnotes.configured) {
    if (goodnotes.needsAttention) {
      channelIssues.push("Goodnotes last delivery failed and needs recovery.");
    } else if (goodnotes.verified) {
      channelIssues.push("Goodnotes is verified but not healthy yet.");
    } else {
      channelIssues.push("Goodnotes is configured but not verified.");
    }
  }

  if (notion.configured) {
    if (notion.needsAttention) {
      channelIssues.push("Notion last sync failed and needs recovery.");
    } else if (notion.verified) {
      channelIssues.push("Notion is verified but not healthy yet.");
    } else {
      channelIssues.push("Notion is configured but not verified.");
    }
  }

  if (channelIssues.length > 0) {
    return channelIssues.join(" ");
  }

  return "No healthy automated delivery channel is configured for this profile.";
}

function buildNoHealthyRecipientsReason(
  unhealthyTargets: DailyBriefSyntheticCanaryUnhealthyTarget[],
) {
  const detail = unhealthyTargets
    .slice(0, 3)
    .map((target) => `${target.parentEmail}: ${target.reason}`)
    .join(" ");

  return detail
    ? `No healthy synthetic canary recipients are configured for this brief. ${detail}`
    : "No healthy synthetic canary recipients are configured for this brief.";
}

export function assessDailyBriefSyntheticCanaryRecipients(input: {
  allProfiles: ParentProfile[];
  targetParentEmails?: string[];
}): DailyBriefSyntheticCanaryHealthAssessment {
  const configuredParentEmails = dedupeEmails(
    input.targetParentEmails?.length
      ? input.targetParentEmails
      : getDailyBriefSyntheticCanaryParentEmails(),
  );
  const profileMap = new Map(
    input.allProfiles.map((profile) => [
      normalizeEmail(profile.parent.email),
      profile,
    ]),
  );
  const healthyProfiles: { parentEmail: string; profile: ParentProfile }[] = [];
  const unhealthyTargets: DailyBriefSyntheticCanaryUnhealthyTarget[] = [];

  for (const parentEmail of configuredParentEmails) {
    const profile = profileMap.get(parentEmail) ?? null;

    if (
      profile &&
      hasAutomatedDeliverySubscription(profile.parent) &&
      hasDispatchableDeliveryChannel(profile)
    ) {
      healthyProfiles.push({ parentEmail, profile });
      continue;
    }

    unhealthyTargets.push({
      parentEmail,
      reason: buildUnhealthyTargetReason(profile),
    });
  }

  const selected = healthyProfiles[0] ?? null;
  const fallbackActivated = Boolean(
    selected && configuredParentEmails[0] !== selected.parentEmail,
  );

  return {
    configuredParentEmails,
    selectedParentEmail: selected?.parentEmail ?? null,
    selectedProfile: selected?.profile ?? null,
    healthyParentEmails: healthyProfiles.map((entry) => entry.parentEmail),
    unhealthyTargets,
    fallbackActivated,
    blocksProduction: configuredParentEmails.length > 0 && !selected,
  };
}

function buildBaseState(
  previousState: DailyBriefSyntheticCanaryState | null | undefined,
  targetParentEmails: string[],
): DailyBriefSyntheticCanaryState {
  return {
    status: previousState?.status ?? "pending",
    targetParentEmails,
    selectedParentEmail: previousState?.selectedParentEmail ?? null,
    healthyParentEmails: previousState?.healthyParentEmails ?? [],
    unhealthyTargets: previousState?.unhealthyTargets ?? [],
    fallbackActivated: previousState?.fallbackActivated ?? false,
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
  return process.env.DAILY_BRIEF_SYNTHETIC_CANARY_ENABLED === "true";
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
  allProfiles: ParentProfile[];
  renderer: DailyBriefPdfRenderer;
  attemptTimestamp: string;
  targetParentEmails?: string[];
  previousState?: DailyBriefSyntheticCanaryState | null;
}) {
  const assessment = assessDailyBriefSyntheticCanaryRecipients({
    allProfiles: input.allProfiles,
    targetParentEmails: input.targetParentEmails,
  });
  const targetParentEmails = assessment.configuredParentEmails;
  const nextState = buildBaseState(input.previousState, targetParentEmails);

  if (!assessment.selectedProfile) {
    return {
      passed: false,
      state: {
        ...nextState,
        status: "blocked" as const,
        selectedParentEmail: assessment.selectedParentEmail,
        healthyParentEmails: assessment.healthyParentEmails,
        unhealthyTargets: assessment.unhealthyTargets,
        fallbackActivated: assessment.fallbackActivated,
        attemptCount: nextState.attemptCount + 1,
        failureCount: nextState.failureCount + 1,
        lastAttemptAt: input.attemptTimestamp,
        blockedAt: input.attemptTimestamp,
        lastFailureReason: buildNoHealthyRecipientsReason(
          assessment.unhealthyTargets,
        ),
        lastFailedTargets: [],
        lastDeliveryReceipts: [],
      },
    };
  }

  const firstAttempt = await deliverHistoryBriefToProfiles(
    [assessment.selectedProfile],
    input.brief,
    {
      attachmentMode: "canary",
      renderer: input.renderer,
    },
  );
  const firstAttemptPassed =
    firstAttempt.failedDeliveryTargets.length === 0 &&
    firstAttempt.deliveryFailureCount === 0 &&
    firstAttempt.deliverySuccessCount > 0;

  if (firstAttemptPassed) {
    return {
      passed: true,
      state: {
        ...nextState,
        status: "passed" as const,
        selectedParentEmail: assessment.selectedParentEmail,
        healthyParentEmails: assessment.healthyParentEmails,
        unhealthyTargets: assessment.unhealthyTargets,
        fallbackActivated: assessment.fallbackActivated,
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
    [assessment.selectedProfile],
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
    combinedFailureCount === 0 &&
    combinedSuccessCount > 0;

  if (passedAfterRetry) {
    return {
      passed: true,
      state: {
        ...nextState,
        status: "passed" as const,
        selectedParentEmail: assessment.selectedParentEmail,
        healthyParentEmails: assessment.healthyParentEmails,
        unhealthyTargets: assessment.unhealthyTargets,
        fallbackActivated: assessment.fallbackActivated,
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
      selectedParentEmail: assessment.selectedParentEmail,
      healthyParentEmails: assessment.healthyParentEmails,
      unhealthyTargets: assessment.unhealthyTargets,
      fallbackActivated: assessment.fallbackActivated,
      attemptCount: nextState.attemptCount + combinedAttemptCount,
      successCount: nextState.successCount + combinedSuccessCount,
      failureCount: nextState.failureCount + combinedFailureCount,
      autoRetryCount: nextState.autoRetryCount + 1,
      lastAttemptAt: input.attemptTimestamp,
      blockedAt: input.attemptTimestamp,
      lastFailureReason:
        buildFailedTargetsReason(combinedFailedTargets) ||
        `Synthetic canary delivery failed after one automatic retry for ${assessment.selectedParentEmail ?? "the selected recipient"}.`,
      lastFailedTargets: combinedFailedTargets,
      lastDeliveryReceipts: combinedReceipts,
      renderAudit:
        secondAttempt.renderAudit ??
        firstAttempt.renderAudit ??
        nextState.renderAudit,
    },
  };
}
