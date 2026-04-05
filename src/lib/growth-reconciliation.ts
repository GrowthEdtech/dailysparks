import { getDerivedAccessState } from "./access-state";
import { getDailyBriefBusinessDate } from "./daily-brief-run-date";
import { hasDispatchableDeliveryChannel } from "./delivery-readiness";
import type { ParentProfile } from "./mvp-types";

const TRIAL_EXPIRING_SOON_WINDOW_HOURS = 72;

export type GrowthReconciliationFamily = {
  parentId: string;
  parentEmail: string;
  fullName: string;
  reason: string;
};

export type GrowthReconciliationBucket = {
  count: number;
  families: GrowthReconciliationFamily[];
};

export type GrowthReconciliationSummary = {
  runDate: string;
  checkedProfileCount: number;
  trialsExpiringSoonWithoutFirstBrief: GrowthReconciliationBucket;
  activeWithoutDispatchableChannel: GrowthReconciliationBucket;
  activeWithoutFirstSuccessfulDelivery: GrowthReconciliationBucket;
  reminderFailuresBlockingActivation: GrowthReconciliationBucket;
};

function toFamily(profile: ParentProfile, reason: string): GrowthReconciliationFamily {
  return {
    parentId: profile.parent.id,
    parentEmail: profile.parent.email,
    fullName: profile.parent.fullName,
    reason,
  };
}

function isTrialExpiringSoonWithoutFirstBrief(profile: ParentProfile, now: Date) {
  if (profile.parent.firstBriefDeliveredAt) {
    return false;
  }

  if (getDerivedAccessState(profile.parent, now) !== "trial_active") {
    return false;
  }

  const trialEndsAt = Date.parse(profile.parent.trialEndsAt);

  if (Number.isNaN(trialEndsAt) || trialEndsAt < now.getTime()) {
    return false;
  }

  return (
    trialEndsAt - now.getTime() <=
    TRIAL_EXPIRING_SOON_WINDOW_HOURS * 60 * 60 * 1000
  );
}

function isActiveWithoutDispatchableChannel(profile: ParentProfile, now: Date) {
  return (
    getDerivedAccessState(profile.parent, now) === "active" &&
    !hasDispatchableDeliveryChannel(profile)
  );
}

function isActiveWithoutFirstSuccessfulDelivery(
  profile: ParentProfile,
  now: Date,
) {
  return (
    getDerivedAccessState(profile.parent, now) === "active" &&
    hasDispatchableDeliveryChannel(profile) &&
    !profile.parent.firstBriefDeliveredAt
  );
}

function isReminderFailureBlockingActivation(profile: ParentProfile, now: Date) {
  return (
    (getDerivedAccessState(profile.parent, now) === "active" ||
      getDerivedAccessState(profile.parent, now) === "trial_active") &&
    profile.parent.onboardingReminderLastStatus === "failed" &&
    !hasDispatchableDeliveryChannel(profile) &&
    !profile.parent.firstBriefDeliveredAt
  );
}

export function getTrialEndingReminderReason(
  profile: ParentProfile,
  now: Date,
): string | null {
  if (!isTrialExpiringSoonWithoutFirstBrief(profile, now)) {
    return null;
  }

  return `Trial expires on ${profile.parent.trialEndsAt.slice(0, 10)} before the first brief has been delivered.`;
}

export function getDeliverySupportAlertReason(
  profile: ParentProfile,
  now: Date,
): string | null {
  if (isActiveWithoutDispatchableChannel(profile, now)) {
    return "Active access is live, but no dispatchable Goodnotes or Notion channel is ready yet.";
  }

  if (isActiveWithoutFirstSuccessfulDelivery(profile, now)) {
    return "A dispatchable delivery channel exists, but the first brief has not been recorded as delivered.";
  }

  if (isReminderFailureBlockingActivation(profile, now)) {
    return (
      profile.parent.onboardingReminderLastError ||
      "The latest onboarding reminder failed and activation is still blocked."
    );
  }

  return null;
}

export function getGrowthReconciliationSummary(
  profiles: ParentProfile[],
  now = new Date(),
): GrowthReconciliationSummary {
  const trialsExpiringSoonWithoutFirstBrief = profiles
    .map((profile) => {
      const reason = getTrialEndingReminderReason(profile, now);
      return reason ? toFamily(profile, reason) : null;
    })
    .filter((family): family is GrowthReconciliationFamily => family !== null);

  const activeWithoutDispatchableChannel = profiles
    .filter((profile) => isActiveWithoutDispatchableChannel(profile, now))
    .map((profile) =>
      toFamily(
        profile,
        "Active access is live, but no dispatchable Goodnotes or Notion channel is ready yet.",
      ),
    );

  const activeWithoutFirstSuccessfulDelivery = profiles
    .filter((profile) => isActiveWithoutFirstSuccessfulDelivery(profile, now))
    .map((profile) =>
      toFamily(
        profile,
        "A dispatchable delivery channel exists, but the first brief has not been recorded as delivered.",
      ),
    );

  const reminderFailuresBlockingActivation = profiles
    .filter((profile) => isReminderFailureBlockingActivation(profile, now))
    .map((profile) =>
      toFamily(
        profile,
        profile.parent.onboardingReminderLastError ||
          "The latest onboarding reminder failed and activation is still blocked.",
      ),
    );

  return {
    runDate: getDailyBriefBusinessDate(now),
    checkedProfileCount: profiles.length,
    trialsExpiringSoonWithoutFirstBrief: {
      count: trialsExpiringSoonWithoutFirstBrief.length,
      families: trialsExpiringSoonWithoutFirstBrief,
    },
    activeWithoutDispatchableChannel: {
      count: activeWithoutDispatchableChannel.length,
      families: activeWithoutDispatchableChannel,
    },
    activeWithoutFirstSuccessfulDelivery: {
      count: activeWithoutFirstSuccessfulDelivery.length,
      families: activeWithoutFirstSuccessfulDelivery,
    },
    reminderFailuresBlockingActivation: {
      count: reminderFailuresBlockingActivation.length,
      families: reminderFailuresBlockingActivation,
    },
  };
}
