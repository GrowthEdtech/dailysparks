import { updateParentNotificationEmailState } from "./mvp-store";
import type { ParentProfile } from "./mvp-types";
import {
  sendDeliverySupportAlertNotification,
  sendTrialEndingReminderNotification,
  type PlannedNotificationSendResult,
} from "./planned-notification-emails";
import { maybeSendBillingStatusNotification } from "./billing-status-notification";
import {
  listPlannedNotificationRunHistory,
  recordPlannedNotificationRun,
} from "./planned-notification-history-store";
import {
  getBillingStatusNotificationCurrentState,
  getBillingStatusNotificationStatus,
  getDeliverySupportNotificationCurrentState,
  getDeliverySupportNotificationStatus,
  getTrialEndingNotificationCurrentState,
  getTrialEndingNotificationStatus,
} from "./planned-notification-state";
import {
  getPlannedNotificationRetryDecision,
} from "./planned-notification-ops";

export type GrowthNotificationRunBucket = {
  checkedCount: number;
  sentCount: number;
  skippedCount: number;
};

export type GrowthNotificationRunResult = {
  trialEnding: GrowthNotificationRunBucket;
  billingStatus: GrowthNotificationRunBucket;
  deliverySupport: GrowthNotificationRunBucket;
};

function countResult(
  accumulator: GrowthNotificationRunBucket,
  result: PlannedNotificationSendResult,
) {
  if (result.sent) {
    accumulator.sentCount += 1;
    return;
  }

  accumulator.skippedCount += 1;
}

export async function runGrowthNotificationEmails(input: {
  profiles: ParentProfile[];
  now?: Date;
}): Promise<GrowthNotificationRunResult> {
  const now = input.now ?? new Date();
  const history = await listPlannedNotificationRunHistory();
  const result: GrowthNotificationRunResult = {
    trialEnding: {
      checkedCount: 0,
      sentCount: 0,
      skippedCount: 0,
    },
    billingStatus: {
      checkedCount: 0,
      sentCount: 0,
      skippedCount: 0,
    },
    deliverySupport: {
      checkedCount: 0,
      sentCount: 0,
      skippedCount: 0,
    },
  };

  for (const profile of input.profiles) {
    const trialEndingState = getTrialEndingNotificationCurrentState(profile, now);
    const trialEndingStatus = getTrialEndingNotificationStatus(profile, now);

    if (trialEndingState) {
      result.trialEnding.checkedCount += 1;

      if (trialEndingStatus.actionable && !trialEndingStatus.deduped) {
        const retryDecision = getPlannedNotificationRetryDecision({
          profile,
          notificationFamily: "trial-ending-reminder",
          history,
          now,
        });

        if (retryDecision.kind === "cooldown" || retryDecision.kind === "escalated") {
          result.trialEnding.skippedCount += 1;
          await recordPlannedNotificationRun({
            runAt: now.toISOString(),
            parentId: profile.parent.id,
            parentEmail: profile.parent.email,
            notificationFamily: "trial-ending-reminder",
            source: "growth-reconciliation",
            status: retryDecision.kind === "cooldown" ? "deferred" : "escalated",
            reason:
              retryDecision.kind === "cooldown"
                ? `Automatic retry is cooling down after a failed trial-ending send.`
                : `Current trial-ending notification now requires manual intervention after repeated failures.`,
            deduped: false,
            messageId: null,
            errorMessage: retryDecision.lastErrorMessage,
            trialEndsAt: trialEndingState.trialEndsAt,
          });
          continue;
        }

        try {
          const sent = await sendTrialEndingReminderNotification({ profile });
          countResult(result.trialEnding, sent);

          await recordPlannedNotificationRun({
            runAt: now.toISOString(),
            parentId: profile.parent.id,
            parentEmail: profile.parent.email,
            notificationFamily: "trial-ending-reminder",
            source: "growth-reconciliation",
            status: sent.sent ? "sent" : "skipped",
            reason: sent.reason ?? trialEndingState.reason,
            deduped: sent.skipped,
            messageId: sent.messageId ?? null,
            errorMessage: null,
            trialEndsAt: trialEndingState.trialEndsAt,
          });

          if (sent.sent) {
            await updateParentNotificationEmailState(profile.parent.email, {
              trialEndingReminderLastNotifiedAt: now.toISOString(),
              trialEndingReminderLastTrialEndsAt: trialEndingState.trialEndsAt,
              trialEndingReminderLastResolvedAt: null,
              trialEndingReminderLastResolvedTrialEndsAt: null,
            });
          }
        } catch (error) {
          result.trialEnding.skippedCount += 1;
          await recordPlannedNotificationRun({
            runAt: now.toISOString(),
            parentId: profile.parent.id,
            parentEmail: profile.parent.email,
            notificationFamily: "trial-ending-reminder",
            source: "growth-reconciliation",
            status: "failed",
            reason: trialEndingState.reason,
            deduped: false,
            messageId: null,
            errorMessage: error instanceof Error ? error.message : "Notification send failed.",
            trialEndsAt: trialEndingState.trialEndsAt,
          });
        }
      } else {
        result.trialEnding.skippedCount += 1;
        await recordPlannedNotificationRun({
          runAt: now.toISOString(),
          parentId: profile.parent.id,
          parentEmail: profile.parent.email,
          notificationFamily: "trial-ending-reminder",
          source: "growth-reconciliation",
          status: trialEndingStatus.label === "Resolved" ? "resolved" : "skipped",
          reason: trialEndingStatus.detail,
          deduped: trialEndingStatus.deduped,
          messageId: null,
          errorMessage: null,
          trialEndsAt: trialEndingState.trialEndsAt,
        });
      }
    }

    const billingStatusState = getBillingStatusNotificationCurrentState(profile);
    const billingStatus = getBillingStatusNotificationStatus(profile);

    if (billingStatusState) {
      result.billingStatus.checkedCount += 1;

      if (billingStatus.actionable) {
        const billingResult = await maybeSendBillingStatusNotification({
          profile,
          invoiceId: billingStatusState.invoiceId,
          invoiceStatus: billingStatusState.invoiceStatus,
          source: "growth-reconciliation",
          now,
        });
        countResult(result.billingStatus, billingResult);
      } else {
        result.billingStatus.skippedCount += 1;
      }
    }

    const deliverySupportState = getDeliverySupportNotificationCurrentState(profile, now);
    const deliverySupportStatus = getDeliverySupportNotificationStatus(profile, now);

    if (deliverySupportState) {
      result.deliverySupport.checkedCount += 1;

      if (deliverySupportStatus.actionable && !deliverySupportStatus.deduped) {
        const retryDecision = getPlannedNotificationRetryDecision({
          profile,
          notificationFamily: "delivery-support-alert",
          history,
          now,
        });

        if (retryDecision.kind === "cooldown" || retryDecision.kind === "escalated") {
          result.deliverySupport.skippedCount += 1;
          await recordPlannedNotificationRun({
            runAt: now.toISOString(),
            parentId: profile.parent.id,
            parentEmail: profile.parent.email,
            notificationFamily: "delivery-support-alert",
            source: "growth-reconciliation",
            status: retryDecision.kind === "cooldown" ? "deferred" : "escalated",
            reason:
              retryDecision.kind === "cooldown"
                ? "Automatic retry is cooling down after a failed delivery-support send."
                : "Current delivery-support notification now requires manual intervention after repeated failures.",
            deduped: false,
            messageId: null,
            errorMessage: retryDecision.lastErrorMessage,
            reasonKey: deliverySupportState.reasonKey,
          });
          continue;
        }

        try {
          const sent = await sendDeliverySupportAlertNotification({
            profile,
            reason: deliverySupportState.reason,
          });
          countResult(result.deliverySupport, sent);

          await recordPlannedNotificationRun({
            runAt: now.toISOString(),
            parentId: profile.parent.id,
            parentEmail: profile.parent.email,
            notificationFamily: "delivery-support-alert",
            source: "growth-reconciliation",
            status: sent.sent ? "sent" : "skipped",
            reason: sent.reason ?? deliverySupportState.reason,
            deduped: sent.skipped,
            messageId: sent.messageId ?? null,
            errorMessage: null,
            reasonKey: deliverySupportState.reasonKey,
          });

          if (sent.sent) {
            await updateParentNotificationEmailState(profile.parent.email, {
              deliverySupportAlertLastNotifiedAt: now.toISOString(),
              deliverySupportAlertLastReasonKey: deliverySupportState.reasonKey,
              deliverySupportAlertLastResolvedAt: null,
              deliverySupportAlertLastResolvedReasonKey: null,
            });
          }
        } catch (error) {
          result.deliverySupport.skippedCount += 1;
          await recordPlannedNotificationRun({
            runAt: now.toISOString(),
            parentId: profile.parent.id,
            parentEmail: profile.parent.email,
            notificationFamily: "delivery-support-alert",
            source: "growth-reconciliation",
            status: "failed",
            reason: deliverySupportState.reason,
            deduped: false,
            messageId: null,
            errorMessage: error instanceof Error ? error.message : "Notification send failed.",
            reasonKey: deliverySupportState.reasonKey,
          });
        }
      } else {
        result.deliverySupport.skippedCount += 1;
        await recordPlannedNotificationRun({
          runAt: now.toISOString(),
          parentId: profile.parent.id,
          parentEmail: profile.parent.email,
          notificationFamily: "delivery-support-alert",
          source: "growth-reconciliation",
          status: deliverySupportStatus.label === "Resolved" ? "resolved" : "skipped",
          reason: deliverySupportStatus.detail,
          deduped: deliverySupportStatus.deduped,
          messageId: null,
          errorMessage: null,
          reasonKey: deliverySupportState.reasonKey,
        });
      }
    }
  }

  return result;
}
