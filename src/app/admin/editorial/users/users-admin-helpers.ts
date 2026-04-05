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
import {
  getDeliverySupportAlertReason,
  getTrialEndingReminderReason,
} from "../../../../lib/growth-reconciliation";
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

export function formatAdminDateTime(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
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

export type PlannedNotificationStatus = {
  label: "Pending" | "Deduped" | "Sent" | "Resolved" | "Not needed";
  detail: string;
  lastSentAt: string | null;
  deduped: boolean;
  actionable: boolean;
};

export type PlannedNotificationStatuses = {
  trialEnding: PlannedNotificationStatus;
  billingStatus: PlannedNotificationStatus;
  deliverySupport: PlannedNotificationStatus;
};

export type PlannedNotificationOpsBucket = {
  actionableCount: number;
  dedupedCount: number;
};

export type PlannedNotificationOpsSummary = {
  trialEnding: PlannedNotificationOpsBucket;
  billingStatus: PlannedNotificationOpsBucket;
  deliverySupport: PlannedNotificationOpsBucket;
};

function buildDeliverySupportReasonKey(reason: string) {
  return reason.trim().toLowerCase();
}

function describeInvoiceStatus(invoiceStatus: string) {
  return invoiceStatus.replaceAll("_", " ").toLowerCase();
}

export function getPlannedNotificationStatuses(
  profile: ParentProfile,
  now = new Date(),
): PlannedNotificationStatuses {
  const trialEndingReason = getTrialEndingReminderReason(profile, now);
  const trialEndingWasSentForCurrentWindow =
    Boolean(profile.parent.trialEndingReminderLastNotifiedAt) &&
    profile.parent.trialEndingReminderLastTrialEndsAt === profile.parent.trialEndsAt;

  const trialEnding: PlannedNotificationStatus = trialEndingReason
    ? trialEndingWasSentForCurrentWindow
      ? {
          label: "Deduped",
          detail: `Latest trial ending reminder already covers this trial window. ${trialEndingReason}`,
          lastSentAt: profile.parent.trialEndingReminderLastNotifiedAt ?? null,
          deduped: true,
          actionable: true,
        }
      : {
          label: "Pending",
          detail: trialEndingReason,
          lastSentAt: profile.parent.trialEndingReminderLastNotifiedAt ?? null,
          deduped: false,
          actionable: true,
        }
    : profile.parent.trialEndingReminderLastNotifiedAt
      ? {
          label: "Sent",
          detail:
            "No current trial-ending notification is due. The latest reminder was already sent for an earlier trial window.",
          lastSentAt: profile.parent.trialEndingReminderLastNotifiedAt,
          deduped: false,
          actionable: false,
        }
      : {
          label: "Not needed",
          detail: "No trial-ending notification is needed right now.",
          lastSentAt: null,
          deduped: false,
          actionable: false,
        };

  const invoiceId = profile.parent.latestInvoiceId?.trim() || null;
  const invoiceStatus = profile.parent.latestInvoiceStatus?.trim() || null;
  const invoiceStatusLabel = invoiceStatus
    ? describeInvoiceStatus(invoiceStatus)
    : null;
  const currentBillingStateAlreadySent =
    Boolean(profile.parent.billingStatusNotificationLastSentAt) &&
    profile.parent.billingStatusNotificationLastInvoiceId === invoiceId &&
    profile.parent.billingStatusNotificationLastInvoiceStatus === invoiceStatus;

  const billingStatusState: PlannedNotificationStatus =
    invoiceId && invoiceStatus && invoiceStatusLabel
      ? currentBillingStateAlreadySent
        ? {
            label: "Deduped",
            detail: `The current invoice ${invoiceStatusLabel} update was already emailed to the parent inbox.`,
            lastSentAt: profile.parent.billingStatusNotificationLastSentAt ?? null,
            deduped: true,
            actionable: true,
          }
        : {
            label: "Pending",
            detail: `The latest invoice ${invoiceStatusLabel} update has not been emailed yet.`,
            lastSentAt: profile.parent.billingStatusNotificationLastSentAt ?? null,
            deduped: false,
            actionable: true,
          }
      : profile.parent.billingStatusNotificationLastSentAt
        ? {
            label: "Sent",
            detail:
              "No newer invoice status needs a billing notification right now.",
            lastSentAt: profile.parent.billingStatusNotificationLastSentAt,
            deduped: false,
            actionable: false,
          }
        : {
            label: "Not needed",
            detail: "No invoice id or status is available for notification.",
            lastSentAt: null,
            deduped: false,
            actionable: false,
          };

  const deliverySupportReason = getDeliverySupportAlertReason(profile, now);
  const currentSupportReasonAlreadySent =
    Boolean(profile.parent.deliverySupportAlertLastNotifiedAt) &&
    deliverySupportReason !== null &&
    profile.parent.deliverySupportAlertLastReasonKey ===
      buildDeliverySupportReasonKey(deliverySupportReason);

  const deliverySupport: PlannedNotificationStatus = deliverySupportReason
    ? currentSupportReasonAlreadySent
      ? {
          label: "Deduped",
          detail: `The current delivery support reason already matches the latest alert. ${deliverySupportReason}`,
          lastSentAt: profile.parent.deliverySupportAlertLastNotifiedAt ?? null,
          deduped: true,
          actionable: true,
        }
      : {
          label: "Pending",
          detail: deliverySupportReason,
          lastSentAt: profile.parent.deliverySupportAlertLastNotifiedAt ?? null,
          deduped: false,
          actionable: true,
        }
    : profile.parent.deliverySupportAlertLastNotifiedAt
      ? {
          label: "Resolved",
          detail: "The latest delivery-support issue has cleared since the last alert.",
          lastSentAt: profile.parent.deliverySupportAlertLastNotifiedAt,
          deduped: false,
          actionable: false,
        }
      : {
          label: "Not needed",
          detail: "No delivery support alert is needed right now.",
          lastSentAt: null,
          deduped: false,
          actionable: false,
        };

  return {
    trialEnding,
    billingStatus: billingStatusState,
    deliverySupport,
  };
}

export function getPlannedNotificationOpsSummary(
  profiles: ParentProfile[],
  now = new Date(),
): PlannedNotificationOpsSummary {
  return profiles.reduce<PlannedNotificationOpsSummary>(
    (summary, profile) => {
      const statuses = getPlannedNotificationStatuses(profile, now);

      return {
        trialEnding: {
          actionableCount:
            summary.trialEnding.actionableCount +
            (statuses.trialEnding.actionable ? 1 : 0),
          dedupedCount:
            summary.trialEnding.dedupedCount +
            (statuses.trialEnding.deduped ? 1 : 0),
        },
        billingStatus: {
          actionableCount:
            summary.billingStatus.actionableCount +
            (statuses.billingStatus.actionable ? 1 : 0),
          dedupedCount:
            summary.billingStatus.dedupedCount +
            (statuses.billingStatus.deduped ? 1 : 0),
        },
        deliverySupport: {
          actionableCount:
            summary.deliverySupport.actionableCount +
            (statuses.deliverySupport.actionable ? 1 : 0),
          dedupedCount:
            summary.deliverySupport.dedupedCount +
            (statuses.deliverySupport.deduped ? 1 : 0),
        },
      };
    },
    {
      trialEnding: {
        actionableCount: 0,
        dedupedCount: 0,
      },
      billingStatus: {
        actionableCount: 0,
        dedupedCount: 0,
      },
      deliverySupport: {
        actionableCount: 0,
        dedupedCount: 0,
      },
    },
  );
}
