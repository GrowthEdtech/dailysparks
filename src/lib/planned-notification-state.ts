import type { ParentProfile } from "./mvp-types";
import {
  getDeliverySupportAlertReason,
  getTrialEndingReminderReason,
} from "./growth-reconciliation";

export type PlannedNotificationFamily =
  | "trial-ending-reminder"
  | "billing-status-update"
  | "delivery-support-alert";

export type PlannedNotificationStatusLabel =
  | "Pending"
  | "Deduped"
  | "Sent"
  | "Resolved"
  | "Not needed";

export type PlannedNotificationStatus = {
  family: PlannedNotificationFamily;
  label: PlannedNotificationStatusLabel;
  detail: string;
  lastSentAt: string | null;
  lastResolvedAt: string | null;
  deduped: boolean;
  actionable: boolean;
};

export type TrialEndingNotificationCurrentState = {
  family: "trial-ending-reminder";
  reason: string;
  trialEndsAt: string;
};

export type BillingStatusNotificationCurrentState = {
  family: "billing-status-update";
  reason: string;
  invoiceId: string;
  invoiceStatus: string;
};

export type DeliverySupportNotificationCurrentState = {
  family: "delivery-support-alert";
  reason: string;
  reasonKey: string;
};

function normalizeNullableString(value: string | null | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function buildDeliverySupportReasonKey(reason: string) {
  return reason.trim().toLowerCase();
}

export function describeInvoiceStatus(invoiceStatus: string) {
  return invoiceStatus.replaceAll("_", " ").toLowerCase();
}

export function getTrialEndingNotificationCurrentState(
  profile: ParentProfile,
  now = new Date(),
): TrialEndingNotificationCurrentState | null {
  const reason = getTrialEndingReminderReason(profile, now);

  if (!reason) {
    return null;
  }

  return {
    family: "trial-ending-reminder",
    reason,
    trialEndsAt: profile.parent.trialEndsAt,
  };
}

export function getBillingStatusNotificationCurrentState(
  profile: ParentProfile,
): BillingStatusNotificationCurrentState | null {
  const invoiceId = normalizeNullableString(profile.parent.latestInvoiceId);
  const invoiceStatus = normalizeNullableString(profile.parent.latestInvoiceStatus);

  if (!invoiceId || !invoiceStatus) {
    return null;
  }

  return {
    family: "billing-status-update",
    reason: `The latest invoice ${describeInvoiceStatus(invoiceStatus)} update has not been emailed yet.`,
    invoiceId,
    invoiceStatus,
  };
}

export function getDeliverySupportNotificationCurrentState(
  profile: ParentProfile,
  now = new Date(),
): DeliverySupportNotificationCurrentState | null {
  const reason = getDeliverySupportAlertReason(profile, now);

  if (!reason) {
    return null;
  }

  return {
    family: "delivery-support-alert",
    reason,
    reasonKey: buildDeliverySupportReasonKey(reason),
  };
}

export function getTrialEndingNotificationStatus(
  profile: ParentProfile,
  now = new Date(),
): PlannedNotificationStatus {
  const current = getTrialEndingNotificationCurrentState(profile, now);
  const currentWindowAlreadySent =
    Boolean(profile.parent.trialEndingReminderLastNotifiedAt) &&
    profile.parent.trialEndingReminderLastTrialEndsAt === profile.parent.trialEndsAt;
  const currentWindowResolved =
    Boolean(profile.parent.trialEndingReminderLastResolvedAt) &&
    profile.parent.trialEndingReminderLastResolvedTrialEndsAt === profile.parent.trialEndsAt;

  if (current && currentWindowResolved) {
    return {
      family: "trial-ending-reminder",
      label: "Resolved",
      detail: `Ops manually resolved the current trial-ending notification state. ${current.reason}`,
      lastSentAt: profile.parent.trialEndingReminderLastNotifiedAt ?? null,
      lastResolvedAt: profile.parent.trialEndingReminderLastResolvedAt ?? null,
      deduped: false,
      actionable: false,
    };
  }

  if (current && currentWindowAlreadySent) {
    return {
      family: "trial-ending-reminder",
      label: "Deduped",
      detail: `Latest trial ending reminder already covers this trial window. ${current.reason}`,
      lastSentAt: profile.parent.trialEndingReminderLastNotifiedAt ?? null,
      lastResolvedAt: profile.parent.trialEndingReminderLastResolvedAt ?? null,
      deduped: true,
      actionable: true,
    };
  }

  if (current) {
    return {
      family: "trial-ending-reminder",
      label: "Pending",
      detail: current.reason,
      lastSentAt: profile.parent.trialEndingReminderLastNotifiedAt ?? null,
      lastResolvedAt: profile.parent.trialEndingReminderLastResolvedAt ?? null,
      deduped: false,
      actionable: true,
    };
  }

  if (profile.parent.trialEndingReminderLastNotifiedAt) {
    return {
      family: "trial-ending-reminder",
      label: "Sent",
      detail:
        "No current trial-ending notification is due. The latest reminder was already sent for an earlier trial window.",
      lastSentAt: profile.parent.trialEndingReminderLastNotifiedAt,
      lastResolvedAt: profile.parent.trialEndingReminderLastResolvedAt ?? null,
      deduped: false,
      actionable: false,
    };
  }

  return {
    family: "trial-ending-reminder",
    label: "Not needed",
    detail: "No trial-ending notification is needed right now.",
    lastSentAt: null,
    lastResolvedAt: profile.parent.trialEndingReminderLastResolvedAt ?? null,
    deduped: false,
    actionable: false,
  };
}

export function getBillingStatusNotificationStatus(
  profile: ParentProfile,
): PlannedNotificationStatus {
  const current = getBillingStatusNotificationCurrentState(profile);
  const currentInvoiceAlreadySent =
    profile.parent.billingStatusNotificationLastInvoiceId === current?.invoiceId &&
    profile.parent.billingStatusNotificationLastInvoiceStatus === current?.invoiceStatus;
  const currentInvoiceResolved =
    Boolean(profile.parent.billingStatusNotificationLastResolvedAt) &&
    profile.parent.billingStatusNotificationLastResolvedInvoiceId === current?.invoiceId &&
    profile.parent.billingStatusNotificationLastResolvedInvoiceStatus ===
      current?.invoiceStatus;

  if (current && currentInvoiceResolved) {
    return {
      family: "billing-status-update",
      label: "Resolved",
      detail: `Ops manually resolved the current invoice ${describeInvoiceStatus(current.invoiceStatus)} update.`,
      lastSentAt: profile.parent.billingStatusNotificationLastSentAt ?? null,
      lastResolvedAt: profile.parent.billingStatusNotificationLastResolvedAt ?? null,
      deduped: false,
      actionable: false,
    };
  }

  if (current && currentInvoiceAlreadySent) {
    return {
      family: "billing-status-update",
      label: "Deduped",
      detail: `The current invoice ${describeInvoiceStatus(current.invoiceStatus)} update was already emailed to the parent inbox.`,
      lastSentAt: profile.parent.billingStatusNotificationLastSentAt ?? null,
      lastResolvedAt: profile.parent.billingStatusNotificationLastResolvedAt ?? null,
      deduped: true,
      actionable: true,
    };
  }

  if (current) {
    return {
      family: "billing-status-update",
      label: "Pending",
      detail: current.reason,
      lastSentAt: profile.parent.billingStatusNotificationLastSentAt ?? null,
      lastResolvedAt: profile.parent.billingStatusNotificationLastResolvedAt ?? null,
      deduped: false,
      actionable: true,
    };
  }

  if (profile.parent.billingStatusNotificationLastSentAt) {
    return {
      family: "billing-status-update",
      label: "Sent",
      detail: "No newer invoice status needs a billing notification right now.",
      lastSentAt: profile.parent.billingStatusNotificationLastSentAt,
      lastResolvedAt: profile.parent.billingStatusNotificationLastResolvedAt ?? null,
      deduped: false,
      actionable: false,
    };
  }

  return {
    family: "billing-status-update",
    label: "Not needed",
    detail: "No invoice id or status is available for notification.",
    lastSentAt: null,
    lastResolvedAt: profile.parent.billingStatusNotificationLastResolvedAt ?? null,
    deduped: false,
    actionable: false,
  };
}

export function getDeliverySupportNotificationStatus(
  profile: ParentProfile,
  now = new Date(),
): PlannedNotificationStatus {
  const current = getDeliverySupportNotificationCurrentState(profile, now);
  const currentReasonAlreadySent =
    Boolean(profile.parent.deliverySupportAlertLastNotifiedAt) &&
    current !== null &&
    profile.parent.deliverySupportAlertLastReasonKey === current.reasonKey;
  const currentReasonResolved =
    Boolean(profile.parent.deliverySupportAlertLastResolvedAt) &&
    current !== null &&
    profile.parent.deliverySupportAlertLastResolvedReasonKey === current.reasonKey;

  if (current && currentReasonResolved) {
    return {
      family: "delivery-support-alert",
      label: "Resolved",
      detail: `Ops manually resolved the current delivery support issue. ${current.reason}`,
      lastSentAt: profile.parent.deliverySupportAlertLastNotifiedAt ?? null,
      lastResolvedAt: profile.parent.deliverySupportAlertLastResolvedAt ?? null,
      deduped: false,
      actionable: false,
    };
  }

  if (current && currentReasonAlreadySent) {
    return {
      family: "delivery-support-alert",
      label: "Deduped",
      detail: `The current delivery support reason already matches the latest alert. ${current.reason}`,
      lastSentAt: profile.parent.deliverySupportAlertLastNotifiedAt ?? null,
      lastResolvedAt: profile.parent.deliverySupportAlertLastResolvedAt ?? null,
      deduped: true,
      actionable: true,
    };
  }

  if (current) {
    return {
      family: "delivery-support-alert",
      label: "Pending",
      detail: current.reason,
      lastSentAt: profile.parent.deliverySupportAlertLastNotifiedAt ?? null,
      lastResolvedAt: profile.parent.deliverySupportAlertLastResolvedAt ?? null,
      deduped: false,
      actionable: true,
    };
  }

  if (profile.parent.deliverySupportAlertLastResolvedAt) {
    return {
      family: "delivery-support-alert",
      label: "Resolved",
      detail: "The latest delivery-support issue was manually resolved by ops.",
      lastSentAt: profile.parent.deliverySupportAlertLastNotifiedAt ?? null,
      lastResolvedAt: profile.parent.deliverySupportAlertLastResolvedAt,
      deduped: false,
      actionable: false,
    };
  }

  if (profile.parent.deliverySupportAlertLastNotifiedAt) {
    return {
      family: "delivery-support-alert",
      label: "Resolved",
      detail: "The latest delivery-support issue has cleared since the last alert.",
      lastSentAt: profile.parent.deliverySupportAlertLastNotifiedAt,
      lastResolvedAt: null,
      deduped: false,
      actionable: false,
    };
  }

  return {
    family: "delivery-support-alert",
    label: "Not needed",
    detail: "No delivery support alert is needed right now.",
    lastSentAt: null,
    lastResolvedAt: null,
    deduped: false,
    actionable: false,
  };
}
