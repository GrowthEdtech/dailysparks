import { getDerivedAccessState } from "./access-state";
import { hasDispatchableDeliveryChannel } from "./delivery-readiness";
import type { ParentProfile } from "./mvp-types";

export const ACTIVATION_FUNNEL_STAGE_KEYS = [
  "signed_in",
  "paid_activated",
  "child_profile_completed",
  "dispatchable_channel_ready",
  "first_brief_delivered",
] as const;

export type ActivationFunnelStageKey =
  (typeof ACTIVATION_FUNNEL_STAGE_KEYS)[number];

export type ActivationFunnelStep = {
  key: ActivationFunnelStageKey;
  label: string;
  completed: boolean;
  completedAt: string | null;
  derived: boolean;
};

export type ActivationFunnelState = {
  currentStage: ActivationFunnelStageKey;
  nextStage: ActivationFunnelStageKey | null;
  completedStepCount: number;
  steps: Record<ActivationFunnelStageKey, ActivationFunnelStep>;
};

function hasMeaningfulStudentName(studentName: string) {
  const normalizedStudentName = studentName.trim().toLowerCase();

  return normalizedStudentName.length > 0 && normalizedStudentName !== "student";
}

function buildStep(input: {
  key: ActivationFunnelStageKey;
  label: string;
  explicitCompletedAt: string | null;
  fallbackCompleted?: boolean;
  fallbackCompletedAt?: string | null;
}): ActivationFunnelStep {
  const completed =
    Boolean(input.explicitCompletedAt) || Boolean(input.fallbackCompleted);
  const completedAt =
    input.explicitCompletedAt ??
    (input.fallbackCompleted ? input.fallbackCompletedAt ?? null : null);

  return {
    key: input.key,
    label: input.label,
    completed,
    completedAt,
    derived: completed && !input.explicitCompletedAt,
  };
}

function getCurrentStage(steps: Record<ActivationFunnelStageKey, ActivationFunnelStep>) {
  if (!steps.paid_activated.completed) {
    return {
      currentStage: "signed_in" as const,
      nextStage: "paid_activated" as const,
    };
  }

  if (!steps.child_profile_completed.completed) {
    return {
      currentStage: "paid_activated" as const,
      nextStage: "child_profile_completed" as const,
    };
  }

  if (!steps.dispatchable_channel_ready.completed) {
    return {
      currentStage: "child_profile_completed" as const,
      nextStage: "dispatchable_channel_ready" as const,
    };
  }

  if (!steps.first_brief_delivered.completed) {
    return {
      currentStage: "dispatchable_channel_ready" as const,
      nextStage: "first_brief_delivered" as const,
    };
  }

  return {
    currentStage: "first_brief_delivered" as const,
    nextStage: null,
  };
}

export function getActivationFunnelState(
  profile: ParentProfile,
): ActivationFunnelState {
  const accessState = getDerivedAccessState(profile.parent);
  const paidActivationTimestamp =
    profile.parent.firstPaidAt ??
    (accessState === "active" || accessState === "trial_active"
      ? profile.parent.subscriptionActivatedAt ?? null
      : null);

  const steps: Record<ActivationFunnelStageKey, ActivationFunnelStep> = {
    signed_in: buildStep({
      key: "signed_in",
      label: "Signed in",
      explicitCompletedAt: profile.parent.firstAuthenticatedAt ?? null,
      fallbackCompleted: true,
      fallbackCompletedAt: profile.parent.createdAt,
    }),
    child_profile_completed: buildStep({
      key: "child_profile_completed",
      label: "Child profile completed",
      explicitCompletedAt: profile.parent.childProfileCompletedAt ?? null,
      fallbackCompleted: hasMeaningfulStudentName(profile.student.studentName),
    }),
    dispatchable_channel_ready: buildStep({
      key: "dispatchable_channel_ready",
      label: "First dispatchable channel ready",
      explicitCompletedAt: profile.parent.firstDispatchableChannelAt ?? null,
      fallbackCompleted: hasDispatchableDeliveryChannel(profile),
    }),
    first_brief_delivered: buildStep({
      key: "first_brief_delivered",
      label: "First brief delivered",
      explicitCompletedAt: profile.parent.firstBriefDeliveredAt ?? null,
    }),
    paid_activated: buildStep({
      key: "paid_activated",
      label: "Paid activated",
      explicitCompletedAt: profile.parent.firstPaidAt ?? null,
      fallbackCompleted: Boolean(paidActivationTimestamp),
      fallbackCompletedAt: paidActivationTimestamp,
    }),
  };
  const currentStage = getCurrentStage(steps);

  return {
    ...currentStage,
    completedStepCount: Object.values(steps).filter((step) => step.completed).length,
    steps,
  };
}
