import { getProfileByEmail, updateParentNotificationEmailState } from "./mvp-store";
import { createPlannedNotificationRunEntry } from "./planned-notification-history-store";
import {
  sendBillingStatusUpdateNotification,
  sendDeliverySupportAlertNotification,
  sendTrialEndingReminderNotification,
} from "./planned-notification-emails";
import {
  getBillingStatusNotificationCurrentState,
  getDeliverySupportNotificationCurrentState,
  getTrialEndingNotificationCurrentState,
  type PlannedNotificationFamily,
} from "./planned-notification-state";
import type { PlannedNotificationRunSource } from "./planned-notification-history-schema";

export class PlannedNotificationActionError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export type PlannedNotificationAction = "resend" | "resolve";

export type PlannedNotificationActionResult = {
  success: boolean;
  parentId: string;
  parentEmail: string;
  notificationFamily: PlannedNotificationFamily;
  action: PlannedNotificationAction;
  messageId: string | null;
  reason: string | null;
};

function getSource(
  action: PlannedNotificationAction,
  mode: "single" | "batch",
): PlannedNotificationRunSource {
  if (mode === "batch") {
    return action === "resend" ? "batch-resend" : "batch-resolve";
  }

  return action === "resend" ? "manual-resend" : "manual-resolve";
}

export async function performPlannedNotificationAction(input: {
  parentEmail: string;
  notificationFamily: PlannedNotificationFamily;
  action: PlannedNotificationAction;
  mode?: "single" | "batch";
  now?: Date;
}): Promise<PlannedNotificationActionResult> {
  const now = input.now ?? new Date();
  const source = getSource(input.action, input.mode ?? "single");
  const parentEmail = input.parentEmail.trim().toLowerCase();
  const profile = await getProfileByEmail(parentEmail);

  if (!profile) {
    throw new PlannedNotificationActionError(
      404,
      "We could not find a family profile for that email.",
    );
  }

  try {
    if (input.notificationFamily === "trial-ending-reminder") {
      const current = getTrialEndingNotificationCurrentState(profile, now);

      if (!current) {
        throw new PlannedNotificationActionError(
          409,
          "No current trial-ending notification state is available.",
        );
      }

      if (input.action === "resolve") {
        await updateParentNotificationEmailState(profile.parent.email, {
          trialEndingReminderLastResolvedAt: now.toISOString(),
          trialEndingReminderLastResolvedTrialEndsAt: current.trialEndsAt,
        });
        await createPlannedNotificationRunEntry({
          runAt: now.toISOString(),
          parentId: profile.parent.id,
          parentEmail: profile.parent.email,
          notificationFamily: input.notificationFamily,
          source,
          status: "resolved",
          reason: current.reason,
          deduped: false,
          messageId: null,
          errorMessage: null,
          trialEndsAt: current.trialEndsAt,
          invoiceId: null,
          invoiceStatus: null,
          reasonKey: null,
        });

        return {
          success: true,
          parentId: profile.parent.id,
          parentEmail,
          notificationFamily: input.notificationFamily,
          action: input.action,
          messageId: null,
          reason: current.reason,
        };
      }

      const sendResult = await sendTrialEndingReminderNotification({ profile });
      await createPlannedNotificationRunEntry({
        runAt: now.toISOString(),
        parentId: profile.parent.id,
        parentEmail: profile.parent.email,
        notificationFamily: input.notificationFamily,
        source,
        status: sendResult.sent ? "sent" : "skipped",
        reason: sendResult.reason ?? current.reason,
        deduped: sendResult.skipped,
        messageId: sendResult.messageId ?? null,
        errorMessage: null,
        trialEndsAt: current.trialEndsAt,
        invoiceId: null,
        invoiceStatus: null,
        reasonKey: null,
      });

      if (sendResult.sent) {
        await updateParentNotificationEmailState(profile.parent.email, {
          trialEndingReminderLastNotifiedAt: now.toISOString(),
          trialEndingReminderLastTrialEndsAt: current.trialEndsAt,
          trialEndingReminderLastResolvedAt: null,
          trialEndingReminderLastResolvedTrialEndsAt: null,
        });
      }

      return {
        success: sendResult.sent,
        parentId: profile.parent.id,
        parentEmail,
        notificationFamily: input.notificationFamily,
        action: input.action,
        messageId: sendResult.messageId ?? null,
        reason: sendResult.reason ?? current.reason,
      };
    }

    if (input.notificationFamily === "billing-status-update") {
      const current = getBillingStatusNotificationCurrentState(profile);

      if (!current) {
        throw new PlannedNotificationActionError(
          409,
          "No current billing notification state is available.",
        );
      }

      if (input.action === "resolve") {
        await updateParentNotificationEmailState(profile.parent.email, {
          billingStatusNotificationLastResolvedAt: now.toISOString(),
          billingStatusNotificationLastResolvedInvoiceId: current.invoiceId,
          billingStatusNotificationLastResolvedInvoiceStatus: current.invoiceStatus,
        });
        await createPlannedNotificationRunEntry({
          runAt: now.toISOString(),
          parentId: profile.parent.id,
          parentEmail: profile.parent.email,
          notificationFamily: input.notificationFamily,
          source,
          status: "resolved",
          reason: current.reason,
          deduped: false,
          messageId: null,
          errorMessage: null,
          trialEndsAt: null,
          invoiceId: current.invoiceId,
          invoiceStatus: current.invoiceStatus,
          reasonKey: null,
        });

        return {
          success: true,
          parentId: profile.parent.id,
          parentEmail,
          notificationFamily: input.notificationFamily,
          action: input.action,
          messageId: null,
          reason: current.reason,
        };
      }

      const sendResult = await sendBillingStatusUpdateNotification({
        profile,
        invoiceStatus: current.invoiceStatus,
      });
      await createPlannedNotificationRunEntry({
        runAt: now.toISOString(),
        parentId: profile.parent.id,
        parentEmail: profile.parent.email,
        notificationFamily: input.notificationFamily,
        source,
        status: sendResult.sent ? "sent" : "skipped",
        reason: sendResult.reason ?? current.reason,
        deduped: sendResult.skipped,
        messageId: sendResult.messageId ?? null,
        errorMessage: null,
        trialEndsAt: null,
        invoiceId: current.invoiceId,
        invoiceStatus: current.invoiceStatus,
        reasonKey: null,
      });

      if (sendResult.sent) {
        await updateParentNotificationEmailState(profile.parent.email, {
          billingStatusNotificationLastSentAt: now.toISOString(),
          billingStatusNotificationLastInvoiceId: current.invoiceId,
          billingStatusNotificationLastInvoiceStatus: current.invoiceStatus,
          billingStatusNotificationLastResolvedAt: null,
          billingStatusNotificationLastResolvedInvoiceId: null,
          billingStatusNotificationLastResolvedInvoiceStatus: null,
        });
      }

      return {
        success: sendResult.sent,
        parentId: profile.parent.id,
        parentEmail,
        notificationFamily: input.notificationFamily,
        action: input.action,
        messageId: sendResult.messageId ?? null,
        reason: sendResult.reason ?? current.reason,
      };
    }

    const current = getDeliverySupportNotificationCurrentState(profile, now);

    if (!current) {
      throw new PlannedNotificationActionError(
        409,
        "No current delivery support notification state is available.",
      );
    }

    if (input.action === "resolve") {
      await updateParentNotificationEmailState(profile.parent.email, {
        deliverySupportAlertLastResolvedAt: now.toISOString(),
        deliverySupportAlertLastResolvedReasonKey: current.reasonKey,
      });
      await createPlannedNotificationRunEntry({
        runAt: now.toISOString(),
        parentId: profile.parent.id,
        parentEmail: profile.parent.email,
        notificationFamily: input.notificationFamily,
        source,
        status: "resolved",
        reason: current.reason,
        deduped: false,
        messageId: null,
        errorMessage: null,
        trialEndsAt: null,
        invoiceId: null,
        invoiceStatus: null,
        reasonKey: current.reasonKey,
      });

      return {
        success: true,
        parentId: profile.parent.id,
        parentEmail,
        notificationFamily: input.notificationFamily,
        action: input.action,
        messageId: null,
        reason: current.reason,
      };
    }

    const sendResult = await sendDeliverySupportAlertNotification({
      profile,
      reason: current.reason,
    });
    await createPlannedNotificationRunEntry({
      runAt: now.toISOString(),
      parentId: profile.parent.id,
      parentEmail: profile.parent.email,
      notificationFamily: input.notificationFamily,
      source,
      status: sendResult.sent ? "sent" : "skipped",
      reason: sendResult.reason ?? current.reason,
      deduped: sendResult.skipped,
      messageId: sendResult.messageId ?? null,
      errorMessage: null,
      trialEndsAt: null,
      invoiceId: null,
      invoiceStatus: null,
      reasonKey: current.reasonKey,
    });

    if (sendResult.sent) {
      await updateParentNotificationEmailState(profile.parent.email, {
        deliverySupportAlertLastNotifiedAt: now.toISOString(),
        deliverySupportAlertLastReasonKey: current.reasonKey,
        deliverySupportAlertLastResolvedAt: null,
        deliverySupportAlertLastResolvedReasonKey: null,
      });
    }

    return {
      success: sendResult.sent,
      parentId: profile.parent.id,
      parentEmail,
      notificationFamily: input.notificationFamily,
      action: input.action,
      messageId: sendResult.messageId ?? null,
      reason: sendResult.reason ?? current.reason,
    };
  } catch (error) {
    if (error instanceof PlannedNotificationActionError) {
      throw error;
    }

    const current =
      input.notificationFamily === "trial-ending-reminder"
        ? getTrialEndingNotificationCurrentState(profile, now)
        : input.notificationFamily === "billing-status-update"
          ? getBillingStatusNotificationCurrentState(profile)
          : getDeliverySupportNotificationCurrentState(profile, now);
    const trialEndsAt =
      input.notificationFamily === "trial-ending-reminder" &&
      current?.family === "trial-ending-reminder"
        ? current.trialEndsAt
        : null;
    const invoiceId =
      input.notificationFamily === "billing-status-update" &&
      current?.family === "billing-status-update"
        ? current.invoiceId
        : null;
    const invoiceStatus =
      input.notificationFamily === "billing-status-update" &&
      current?.family === "billing-status-update"
        ? current.invoiceStatus
        : null;
    const reasonKey =
      input.notificationFamily === "delivery-support-alert" &&
      current?.family === "delivery-support-alert"
        ? current.reasonKey
        : null;

    await createPlannedNotificationRunEntry({
      runAt: now.toISOString(),
      parentId: profile.parent.id,
      parentEmail: profile.parent.email,
      notificationFamily: input.notificationFamily,
      source,
      status: "failed",
      reason: current?.reason ?? null,
      deduped: false,
      messageId: null,
      errorMessage:
        error instanceof Error ? error.message : "The notification action failed.",
      trialEndsAt,
      invoiceId,
      invoiceStatus,
      reasonKey,
    });
    throw error;
  }
}
