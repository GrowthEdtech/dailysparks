import { updateParentNotificationEmailState } from "./mvp-store";
import type { ParentProfile } from "./mvp-types";
import {
  listPlannedNotificationRunHistory,
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
import {
  getPlannedNotificationRetryDecision,
} from "./planned-notification-ops";
import type { PlannedNotificationRunSource } from "./planned-notification-history-schema";

export async function maybeSendBillingStatusNotification(input: {
  profile: ParentProfile;
  invoiceId: string | null;
  invoiceStatus: string | null;
  now?: Date;
  source?: PlannedNotificationRunSource;
}): Promise<PlannedNotificationSendResult> {
  const now = input.now ?? new Date();
  const invoiceId = input.invoiceId?.trim() || null;
  const invoiceStatus = input.invoiceStatus?.trim() || null;
  const source = input.source ?? "stripe-webhook";

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
      source,
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
      source,
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
      source,
      status: status.label === "Resolved" ? "resolved" : "skipped",
      reason: status.detail,
      deduped: status.deduped,
      invoiceId,
      invoiceStatus,
    });

    return result;
  }

  const history = await listPlannedNotificationRunHistory();
  const retryDecision = getPlannedNotificationRetryDecision({
    profile: {
      ...input.profile,
      parent: {
        ...input.profile.parent,
        latestInvoiceId: invoiceId,
        latestInvoiceStatus: invoiceStatus,
      },
    },
    notificationFamily: "billing-status-update",
    history,
    now,
  });

  if (retryDecision.kind === "cooldown" || retryDecision.kind === "escalated") {
    const reason =
      retryDecision.kind === "cooldown"
        ? "Automatic retry is cooling down after a failed billing-status send."
        : "Current billing-status notification now requires manual intervention after repeated failures.";

    await recordPlannedNotificationRun({
      runAt: now.toISOString(),
      parentId: input.profile.parent.id,
      parentEmail: input.profile.parent.email,
      notificationFamily: "billing-status-update",
      source,
      status: retryDecision.kind === "cooldown" ? "deferred" : "escalated",
      reason,
      deduped: false,
      errorMessage: retryDecision.lastErrorMessage,
      invoiceId,
      invoiceStatus,
    });

    return {
      sent: false,
      skipped: true,
      reason,
    };
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
      source,
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
      source,
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
