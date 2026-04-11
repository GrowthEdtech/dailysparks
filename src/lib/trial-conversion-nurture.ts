import type { ParentProfile } from "./mvp-types";
import { getDerivedAccessState } from "./access-state";

export type TrialConversionNurtureStage = {
  index: number;
  label: string;
  delayHours: number;
};

export type TrialConversionNurtureAssessment = {
  eligible: boolean;
  due: boolean;
  reason: string;
  stage: TrialConversionNurtureStage | null;
};

export const TRIAL_CONVERSION_NURTURE_STAGES: TrialConversionNurtureStage[] = [
  {
    index: 1,
    label: "24-hour first-value reinforcement",
    delayHours: 24,
  },
  {
    index: 2,
    label: "96-hour conversion reinforcement",
    delayHours: 96,
  },
];

function getNextStage(profile: ParentProfile) {
  const attemptedStageCount = Math.max(
    profile.parent.trialConversionNurtureCount ?? 0,
    profile.parent.trialConversionNurtureLastStage ?? 0,
  );

  return (
    TRIAL_CONVERSION_NURTURE_STAGES.find(
      (stage) => stage.index === attemptedStageCount + 1,
    ) ?? null
  );
}

export function assessTrialConversionNurture(input: {
  profile: ParentProfile;
  now: Date;
}): TrialConversionNurtureAssessment {
  const accessState = getDerivedAccessState(input.profile.parent, input.now);

  if (!input.profile.parent.firstBriefDeliveredAt) {
    return {
      eligible: false,
      due: false,
      reason: "The family has not reached first brief delivery yet.",
      stage: null,
    };
  }

  if (
    input.profile.parent.firstPaidAt ||
    input.profile.parent.subscriptionStatus === "active" ||
    input.profile.parent.subscriptionActivatedAt
  ) {
    return {
      eligible: false,
      due: false,
      reason: "This family already paid for Daily Sparks.",
      stage: null,
    };
  }

  if (accessState !== "trial_active") {
    return {
      eligible: false,
      due: false,
      reason: "Trial conversion nurture only applies to active trial families.",
      stage: null,
    };
  }

  const nextStage = getNextStage(input.profile);

  if (!nextStage) {
    return {
      eligible: false,
      due: false,
      reason: "All trial conversion nurture stages have already been attempted.",
      stage: null,
    };
  }

  const firstBriefDeliveredAtTime = new Date(
    input.profile.parent.firstBriefDeliveredAt,
  ).getTime();
  const dueAtTime = firstBriefDeliveredAtTime + nextStage.delayHours * 60 * 60 * 1000;

  if (input.now.getTime() < dueAtTime) {
    return {
      eligible: true,
      due: false,
      reason: "The family has not reached the next trial conversion nurture window yet.",
      stage: null,
    };
  }

  return {
    eligible: true,
    due: true,
    reason: "The family is due for the next trial conversion nurture stage.",
    stage: nextStage,
  };
}
