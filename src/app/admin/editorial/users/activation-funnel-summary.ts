import {
  ACTIVATION_FUNNEL_STAGE_KEYS,
  getActivationFunnelState,
  type ActivationFunnelStageKey,
} from "../../../../lib/activation-funnel";
import type { OnboardingReminderRunRecord } from "../../../../lib/onboarding-reminder-history-schema";
import type { ParentProfile } from "../../../../lib/mvp-types";

const STUCK_STAGE_DELAY_HOURS = 24;

export type ActivationAttentionState = {
  kind: "stuck" | "paid_without_delivery" | "reminder_failed";
  title: string;
  detail: string;
  severity: "warning" | "danger";
};

export type ActivationDashboardSummary = {
  counts: Record<ActivationFunnelStageKey, number>;
  stuckCount: number;
  paidButNotDeliveredCount: number;
  reminderFailureCount: number;
  reminderEvidence: {
    totalRuns: number;
    sentRuns: number;
    failedRuns: number;
  };
  attentionProfiles: Array<{
    profile: ParentProfile;
    attention: ActivationAttentionState;
  }>;
};

function hasReminderFailure(profile: ParentProfile) {
  return profile.parent.onboardingReminderLastStatus === "failed";
}

function isPaidButNotDelivered(profile: ParentProfile) {
  const funnelState = getActivationFunnelState(profile);

  return (
    funnelState.steps.paid_activated.completed &&
    !funnelState.steps.first_brief_delivered.completed
  );
}

function getTimestampForStage(
  profile: ParentProfile,
  stageKey: "signed_in" | "child_profile_completed" | "dispatchable_channel_ready",
) {
  const funnelState = getActivationFunnelState(profile);

  return funnelState.steps[stageKey].completedAt;
}

function isPastStuckThreshold(timestamp: string | null, now: Date) {
  if (!timestamp) {
    return false;
  }

  const parsedTimestamp = Date.parse(timestamp);

  if (Number.isNaN(parsedTimestamp)) {
    return false;
  }

  return (
    now.getTime() - parsedTimestamp >= STUCK_STAGE_DELAY_HOURS * 60 * 60 * 1000
  );
}

function getStuckStageState(profile: ParentProfile, now: Date) {
  if (isPaidButNotDelivered(profile)) {
    return null;
  }

  const funnelState = getActivationFunnelState(profile);

  if (
    funnelState.currentStage === "signed_in" &&
    isPastStuckThreshold(getTimestampForStage(profile, "signed_in"), now)
  ) {
    return {
      kind: "stuck" as const,
      title: "Child profile still missing",
      detail:
        "This family signed in but has not yet completed the child profile milestone.",
      severity: "warning" as const,
    };
  }

  if (
    funnelState.currentStage === "child_profile_completed" &&
    isPastStuckThreshold(
      getTimestampForStage(profile, "child_profile_completed"),
      now,
    )
  ) {
    return {
      kind: "stuck" as const,
      title: "Channel setup stalled",
      detail:
        "The child profile is complete, but no dispatchable delivery channel has been connected yet.",
      severity: "warning" as const,
    };
  }

  if (
    funnelState.currentStage === "dispatchable_channel_ready" &&
    isPastStuckThreshold(
      getTimestampForStage(profile, "dispatchable_channel_ready"),
      now,
    )
  ) {
    return {
      kind: "stuck" as const,
      title: "Dispatchable but waiting for first brief",
      detail:
        "A delivery channel is ready, but the first successful brief has not landed yet.",
      severity: "warning" as const,
    };
  }

  return null;
}

export function getActivationAttentionState(
  profile: ParentProfile,
  now: Date = new Date(),
): ActivationAttentionState | null {
  if (isPaidButNotDelivered(profile)) {
    return {
      kind: "paid_without_delivery",
      title: "Paid but first brief not delivered",
      detail:
        "This family has converted to paid access before receiving a first successful brief.",
      severity: "danger",
    };
  }

  const stuckStageState = getStuckStageState(profile, now);

  if (stuckStageState) {
    return stuckStageState;
  }

  if (hasReminderFailure(profile)) {
    return {
      kind: "reminder_failed",
      title: "Reminder failed",
      detail:
        profile.parent.onboardingReminderLastError ||
        "The latest onboarding activation reminder failed to send.",
      severity: "warning",
    };
  }

  return null;
}

export function getRecentReminderRunsForParent(
  reminderRuns: OnboardingReminderRunRecord[],
  parentId: string,
  limit = 5,
) {
  return reminderRuns
    .filter((entry) => entry.parentId === parentId)
    .sort((left, right) => right.runAt.localeCompare(left.runAt))
    .slice(0, limit);
}

export function getActivationDashboardSummary(
  profiles: ParentProfile[],
  reminderRuns: OnboardingReminderRunRecord[],
  now: Date = new Date(),
): ActivationDashboardSummary {
  const counts = ACTIVATION_FUNNEL_STAGE_KEYS.reduce<
    Record<ActivationFunnelStageKey, number>
  >(
    (accumulator, stageKey) => ({ ...accumulator, [stageKey]: 0 }),
    {
      signed_in: 0,
      child_profile_completed: 0,
      dispatchable_channel_ready: 0,
      first_brief_delivered: 0,
      paid_activated: 0,
    },
  );

  const attentionProfiles = profiles.flatMap((profile) => {
    const funnelState = getActivationFunnelState(profile);

    for (const stageKey of ACTIVATION_FUNNEL_STAGE_KEYS) {
      if (funnelState.steps[stageKey].completed) {
        counts[stageKey] += 1;
      }
    }

    const attention = getActivationAttentionState(profile, now);

    return attention ? [{ profile, attention }] : [];
  });

  return {
    counts,
    stuckCount: profiles.filter((profile) => getStuckStageState(profile, now)).length,
    paidButNotDeliveredCount: profiles.filter(isPaidButNotDelivered).length,
    reminderFailureCount: profiles.filter(hasReminderFailure).length,
    reminderEvidence: {
      totalRuns: reminderRuns.length,
      sentRuns: reminderRuns.filter((entry) => entry.status === "sent").length,
      failedRuns: reminderRuns.filter((entry) => entry.status === "failed").length,
    },
    attentionProfiles,
  };
}
