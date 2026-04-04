import type {
  ParentProfile,
  SubscriptionPlan,
} from "../../../../lib/mvp-types";
import {
  DERIVED_ACCESS_STATES,
  getDerivedAccessState,
  getDerivedAccessStateFilterLabel,
  getDerivedUserTypeLabel as getDerivedUserTypeLabelFromAccessState,
  isDerivedAccessStateFilter,
  type DerivedAccessState,
} from "../../../../lib/access-state";
import {
  formatPreferredDeliveryLocalTime,
  formatTimeZoneLabel,
  getCountryLabel,
} from "../../../../lib/delivery-locale";
import { getFamilyDeliveryHealthRollup } from "../../../../lib/delivery-health-rollup";
import { assessOnboardingActivationReminder } from "../../../../lib/onboarding-activation-reminder";

export const USER_STATUS_FILTERS = DERIVED_ACCESS_STATES;

export function isSubscriptionStatus(
  value: string | undefined,
): value is DerivedAccessState {
  return isDerivedAccessStateFilter(value);
}

export function getDerivedUserTypeLabel(profile: ParentProfile["parent"]) {
  return getDerivedUserTypeLabelFromAccessState(profile);
}

export function getDerivedAccessFilterLabel(state: DerivedAccessState) {
  return getDerivedAccessStateFilterLabel(state);
}

export function getPlanLabel(plan: SubscriptionPlan) {
  if (plan === "yearly") {
    return "Yearly plan";
  }

  if (plan === "monthly") {
    return "Monthly plan";
  }

  return "No plan selected";
}

export function formatAdminDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
}

function formatInvoiceStatus(value: string | null) {
  if (!value) {
    return "No invoice yet";
  }

  return `Invoice ${value.replaceAll("_", " ").toLowerCase()}`;
}

export function getInvoiceStatusLabel(profile: ParentProfile) {
  return formatInvoiceStatus(profile.parent.latestInvoiceStatus);
}

export function getDeliveryLabels(profile: ParentProfile) {
  return getFamilyDeliveryHealthRollup(profile).labels;
}

export function getCountryRegionLabel(profile: ParentProfile) {
  return getCountryLabel(profile.parent.countryCode);
}

export function getLocalDeliveryScheduleLabel(profile: ParentProfile) {
  return `${formatPreferredDeliveryLocalTime(
    profile.parent.preferredDeliveryLocalTime,
  )} · ${formatTimeZoneLabel(profile.parent.deliveryTimeZone)}`;
}

export function compareProfilesByCreatedAtDesc(
  left: ParentProfile,
  right: ParentProfile,
) {
  const leftTimestamp = Date.parse(left.parent.createdAt);
  const rightTimestamp = Date.parse(right.parent.createdAt);

  if (!Number.isNaN(leftTimestamp) && !Number.isNaN(rightTimestamp)) {
    return rightTimestamp - leftTimestamp;
  }

  return right.parent.createdAt.localeCompare(left.parent.createdAt);
}

export function countProfilesByStatus(profiles: ParentProfile[]) {
  return profiles.reduce<Record<DerivedAccessState, number>>(
    (counts, profile) => ({
      ...counts,
      [getDerivedAccessState(profile.parent)]:
        counts[getDerivedAccessState(profile.parent)] + 1,
    }),
    {
      active: 0,
      trial_active: 0,
      trial_expired: 0,
      canceled: 0,
      free: 0,
    },
  );
}

export function countProfilesNeedingActivationReminder(profiles: ParentProfile[]) {
  return profiles.reduce((count, profile) => {
    const assessment = assessOnboardingActivationReminder({ profile });

    return assessment.due || profile.parent.onboardingReminderLastStatus === "failed"
      ? count + 1
      : count;
  }, 0);
}

export function getOnboardingReminderStatus(profile: ParentProfile) {
  const assessment = assessOnboardingActivationReminder({ profile });
  const reminderCount = profile.parent.onboardingReminderCount;

  if (profile.parent.onboardingReminderLastStatus === "failed") {
    return {
      label: "Reminder failed",
      detail:
        profile.parent.onboardingReminderLastError ||
        "The latest activation reminder failed to send.",
    };
  }

  if (assessment.due) {
    return {
      label: "Reminder due",
      detail: assessment.reason,
    };
  }

  if (reminderCount > 0 && assessment.eligible) {
    return {
      label: `${reminderCount} reminder sent${reminderCount === 1 ? "" : "s"}`,
      detail: assessment.reason,
    };
  }

  if (!assessment.eligible && /dispatchable channel/i.test(assessment.reason)) {
    return {
      label: "Connected",
      detail: "Activation reminders are no longer needed because delivery is ready.",
    };
  }

  return {
    label: "Not reminded yet",
    detail: assessment.reason,
  };
}
