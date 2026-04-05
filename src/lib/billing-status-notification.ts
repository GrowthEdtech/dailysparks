import { updateParentNotificationEmailState } from "./mvp-store";
import type { ParentProfile } from "./mvp-types";
import {
  recordPlannedNotificationRun,
} from "./planned-notification-history-store";
import {
  sendBillingStatusUpdateNotification,
  type PlannedNotificationSendResult,
} from "./planned-notification-emails";
import {
  getBillingStatusNotificationCurrentState,
  getBillingStatusNotificationStatus,
} from "./planned-notification-state";

export async function maybeSendBillingStatusNotification(input: {
  profile: ParentProfile;
  invoiceId: string | null;
  invoiceStatus: string | null;
  now?: Date;
}): Promise<PlannedNotificationSendResult> {
  const now = input.now ?? new Date();
  const invoiceId = input.invoiceId?.trim() || null;
  const invoiceStatus = input.invoiceStatus?.trim() || null;

  if (!invoiceId || !invoiceStatus) {
    const result = {
      sent: false,
      skipped: true,
      reason: "No invoice id or status is available for notification.",
    };

    await recordPlannedNotificationRun({
      runAt: now.toISOString(),
      parentId: input.profile.parent.id,
      parentEmail: input.profile.parent.email,
      notificationFamily: "billing-status-update",
      source: "stripe-webhook",
      status: "skipped",
      reason: result.reason,
      deduped: false,
    });

    return result;
  }

  const current = getBillingStatusNotificationCurrentState({
    ...input.profile,
    parent: {
      ...input.profile.parent,
      latestInvoiceId: invoiceId,
      latestInvoiceStatus: invoiceStatus,
    },
  });
  const status = getBillingStatusNotificationStatus({
    ...input.profile,
    parent: {
      ...input.profile.parent,
      latestInvoiceId: invoiceId,
      latestInvoiceStatus: invoiceStatus,
    },
  });

  if (!current) {
    const result = {
      sent: false,
      skipped: true,
      reason: "No invoice id or status is available for notification.",
    };

    await recordPlannedNotificationRun({
      runAt: now.toISOString(),
      parentId: input.profile.parent.id,
      parentEmail: input.profile.parent.email,
      notificationFamily: "billing-status-update",
      source: "stripe-webhook",
      status: "skipped",
      reason: result.reason,
      deduped: false,
      invoiceId,
      invoiceStatus,
    });

    return result;
  }

  if (!status.actionable || status.deduped) {
    const result = {
      sent: false,
      skipped: true,
      reason:
        status.label === "Resolved"
          ? "The current invoice status notification was manually resolved."
          : "This invoice status notification was already sent.",
    };

    await recordPlannedNotificationRun({
      runAt: now.toISOString(),
      parentId: input.profile.parent.id,
      parentEmail: input.profile.parent.email,
      notificationFamily: "billing-status-update",
      source: "stripe-webhook",
      status: status.label === "Resolved" ? "resolved" : "skipped",
      reason: status.detail,
      deduped: status.deduped,
      invoiceId,
      invoiceStatus,
    });

    return result;
  }

  try {
    const result = await sendBillingStatusUpdateNotification({
      profile: input.profile,
      invoiceStatus,
    });

    await recordPlannedNotificationRun({
      runAt: now.toISOString(),
      parentId: input.profile.parent.id,
      parentEmail: input.profile.parent.email,
      notificationFamily: "billing-status-update",
      source: "stripe-webhook",
      status: result.sent ? "sent" : "skipped",
      reason: result.reason ?? current.reason,
      deduped: result.skipped,
      messageId: result.messageId ?? null,
      invoiceId,
      invoiceStatus,
    });

    if (result.sent) {
      await updateParentNotificationEmailState(input.profile.parent.email, {
        billingStatusNotificationLastSentAt: now.toISOString(),
        billingStatusNotificationLastInvoiceId: invoiceId,
        billingStatusNotificationLastInvoiceStatus: invoiceStatus,
        billingStatusNotificationLastResolvedAt: null,
        billingStatusNotificationLastResolvedInvoiceId: null,
        billingStatusNotificationLastResolvedInvoiceStatus: null,
      });
    }

    return result;
  } catch (error) {
    await recordPlannedNotificationRun({
      runAt: now.toISOString(),
      parentId: input.profile.parent.id,
      parentEmail: input.profile.parent.email,
      notificationFamily: "billing-status-update",
      source: "stripe-webhook",
      status: "failed",
      reason: current.reason,
      deduped: false,
      errorMessage: error instanceof Error ? error.message : "Notification send failed.",
      invoiceId,
      invoiceStatus,
    });
    throw error;
  }
}
