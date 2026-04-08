import { getDerivedAccessState } from "./access-state";
import { getFamilyDeliveryHealthRollup } from "./delivery-health-rollup";
import { parsePreferredDeliveryLocalTime } from "./delivery-window";
import type { ParentProfile } from "./mvp-types";

export const ONBOARDING_ACTIVATION_REMINDER_STAGES = [
  { index: 1, delayHours: 24, label: "First activation reminder" },
  { index: 2, delayHours: 72, label: "Follow-up activation reminder" },
  { index: 3, delayHours: 168, label: "Final activation reminder" },
] as const;

const ONBOARDING_REMINDER_SUCCESS_COOLDOWN_HOURS = 24;
const ONBOARDING_REMINDER_FAILED_RETRY_COOLDOWN_HOURS = 2;

export type OnboardingActivationReminderStage =
  (typeof ONBOARDING_ACTIVATION_REMINDER_STAGES)[number];

export type OnboardingActivationReminderAssessment = {
  eligible: boolean;
  due: boolean;
  stage: OnboardingActivationReminderStage | null;
  reason: string;
};

function hasMeaningfulStudentName(studentName: string) {
  const normalizedStudentName = studentName.trim().toLowerCase();

  return normalizedStudentName.length > 0 && normalizedStudentName !== "student";
}

function getLocalTimeMinutes(timestamp: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(timestamp);
  const lookup = new Map(parts.map((part) => [part.type, part.value]));
  const hour = Number.parseInt(lookup.get("hour") ?? "0", 10);
  const minute = Number.parseInt(lookup.get("minute") ?? "0", 10);

  return hour * 60 + minute;
}

function hasReachedPreferredLocalTime(profile: ParentProfile, now: Date) {
  const preferredMinutes =
    parsePreferredDeliveryLocalTime(profile.parent.preferredDeliveryLocalTime) ?? 540;

  return (
    getLocalTimeMinutes(now, profile.parent.deliveryTimeZone) >= preferredMinutes
  );
}

function hasRecentReminderAttempt(profile: ParentProfile, now: Date) {
  const lastAttemptAt = profile.parent.onboardingReminderLastAttemptAt;

  if (!lastAttemptAt) {
    return false;
  }

  const lastAttemptTimestamp = Date.parse(lastAttemptAt);

  if (Number.isNaN(lastAttemptTimestamp)) {
    return false;
  }

  const cooldownHours =
    profile.parent.onboardingReminderLastStatus === "failed"
      ? ONBOARDING_REMINDER_FAILED_RETRY_COOLDOWN_HOURS
      : ONBOARDING_REMINDER_SUCCESS_COOLDOWN_HOURS;

  return now.getTime() - lastAttemptTimestamp < cooldownHours * 60 * 60 * 1000;
}

function getReminderAnchorTimestamp(profile: ParentProfile) {
  const firstAuthenticatedTimestamp = Date.parse(
    profile.parent.firstAuthenticatedAt ?? "",
  );

  if (!Number.isNaN(firstAuthenticatedTimestamp)) {
    return firstAuthenticatedTimestamp;
  }

  return Date.parse(profile.parent.createdAt);
}

export function assessOnboardingActivationReminder(input: {
  profile: ParentProfile;
  now?: Date;
}): OnboardingActivationReminderAssessment {
  const now = input.now ?? new Date();
  const { profile } = input;
  const accessState = getDerivedAccessState(profile.parent, now);
  const deliveryHealth = getFamilyDeliveryHealthRollup(profile);

  if (!(accessState === "active" || accessState === "trial_active")) {
    return {
      eligible: false,
      due: false,
      stage: null,
      reason: "Family access is not active enough for onboarding reminders.",
    };
  }

  if (!hasMeaningfulStudentName(profile.student.studentName)) {
    return {
      eligible: false,
      due: false,
      stage: null,
      reason: "Student setup is incomplete, so activation reminders are not ready.",
    };
  }

  if (deliveryHealth.overall === "healthy") {
    return {
      eligible: false,
      due: false,
      stage: null,
      reason: "Family already has a dispatchable channel.",
    };
  }

  if (deliveryHealth.overall === "attention") {
    return {
      eligible: false,
      due: false,
      stage: null,
      reason: "Delivery channel needs support instead of an activation reminder.",
    };
  }

  if (
    profile.parent.onboardingReminderCount >=
    ONBOARDING_ACTIVATION_REMINDER_STAGES.length
  ) {
    return {
      eligible: false,
      due: false,
      stage: null,
      reason: "Activation reminder sequence is already exhausted.",
    };
  }

  const nextStage =
    ONBOARDING_ACTIVATION_REMINDER_STAGES[profile.parent.onboardingReminderCount] ??
    null;

  if (!nextStage) {
    return {
      eligible: false,
      due: false,
      stage: null,
      reason: "Activation reminder sequence is already exhausted.",
    };
  }

  const reminderAnchorTimestamp = getReminderAnchorTimestamp(profile);
  const stageDueAtTimestamp =
    reminderAnchorTimestamp + nextStage.delayHours * 60 * 60 * 1000;

  if (
    Number.isNaN(reminderAnchorTimestamp) ||
    now.getTime() < stageDueAtTimestamp
  ) {
    return {
      eligible: true,
      due: false,
      stage: nextStage,
      reason: `${nextStage.label} has not reached its elapsed-time gate yet.`,
    };
  }

  if (hasRecentReminderAttempt(profile, now)) {
    return {
      eligible: true,
      due: false,
      stage: nextStage,
      reason: `${nextStage.label} is cooling down after a recent attempt.`,
    };
  }

  if (!hasReachedPreferredLocalTime(profile, now)) {
    return {
      eligible: true,
      due: false,
      stage: nextStage,
      reason: `${nextStage.label} is waiting for the local reminder window to open.`,
    };
  }

  return {
    eligible: true,
    due: true,
    stage: nextStage,
    reason: `${nextStage.label} is due now.`,
  };
}
