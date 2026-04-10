import type { MarketingLeadRecord } from "./marketing-lead-store-types";

export type MarketingLeadNurtureStage = {
  index: number;
  label: string;
  delayHours: number;
};

export type MarketingLeadNurtureAssessment = {
  eligible: boolean;
  due: boolean;
  reason: string;
  stage: MarketingLeadNurtureStage | null;
};

export const MARKETING_LEAD_NURTURE_STAGES: MarketingLeadNurtureStage[] = [
  {
    index: 1,
    label: "24-hour follow-up",
    delayHours: 24,
  },
  {
    index: 2,
    label: "96-hour follow-up",
    delayHours: 96,
  },
  {
    index: 3,
    label: "192-hour follow-up",
    delayHours: 192,
  },
];

function getNextStage(lead: MarketingLeadRecord) {
  const attemptedStageCount = Math.max(
    lead.nurtureEmailCount ?? 0,
    lead.nurtureLastStage ?? 0,
  );

  return (
    MARKETING_LEAD_NURTURE_STAGES.find(
      (stage) => stage.index === attemptedStageCount + 1,
    ) ?? null
  );
}

export function assessMarketingLeadNurture(input: {
  lead: MarketingLeadRecord;
  now: Date;
  hasParentProfile: boolean;
}): MarketingLeadNurtureAssessment {
  if (input.hasParentProfile) {
    return {
      eligible: false,
      due: false,
      reason: "Lead already converted into a parent profile.",
      stage: null,
    };
  }

  const nextStage = getNextStage(input.lead);

  if (!nextStage) {
    return {
      eligible: false,
      due: false,
      reason: "All nurture stages have already been attempted.",
      stage: null,
    };
  }

  const createdAtTime = new Date(input.lead.createdAt).getTime();
  const dueAtTime = createdAtTime + nextStage.delayHours * 60 * 60 * 1000;

  if (input.now.getTime() < dueAtTime) {
    return {
      eligible: true,
      due: false,
      reason: "Lead has not reached the next nurture stage window yet.",
      stage: null,
    };
  }

  return {
    eligible: true,
    due: true,
    reason: "Lead is due for the next nurture stage.",
    stage: nextStage,
  };
}
