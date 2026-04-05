import { updateParentNotificationEmailState } from "./mvp-store";
import type { ParentProfile } from "./mvp-types";
import {
  getDeliverySupportAlertReason,
  getTrialEndingReminderReason,
} from "./growth-reconciliation";
import {
  sendDeliverySupportAlertNotification,
  sendTrialEndingReminderNotification,
  type PlannedNotificationSendResult,
} from "./planned-notification-emails";

export type GrowthNotificationRunBucket = {
  checkedCount: number;
  sentCount: number;
  skippedCount: number;
};

export type GrowthNotificationRunResult = {
  trialEnding: GrowthNotificationRunBucket;
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

function hasAlreadySentTrialEndingReminder(profile: ParentProfile) {
  return (
    profile.parent.trialEndingReminderLastTrialEndsAt ===
    profile.parent.trialEndsAt
  );
}

function buildDeliverySupportReasonKey(reason: string) {
  return reason.trim().toLowerCase();
}

export async function runGrowthNotificationEmails(input: {
  profiles: ParentProfile[];
  now?: Date;
}): Promise<GrowthNotificationRunResult> {
  const now = input.now ?? new Date();
  const result: GrowthNotificationRunResult = {
    trialEnding: {
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
    const trialEndingReason = getTrialEndingReminderReason(profile, now);

    if (trialEndingReason) {
      result.trialEnding.checkedCount += 1;

      if (!hasAlreadySentTrialEndingReminder(profile)) {
        const sent = await sendTrialEndingReminderNotification({ profile });
        countResult(result.trialEnding, sent);

        if (sent.sent) {
          await updateParentNotificationEmailState(profile.parent.email, {
            trialEndingReminderLastNotifiedAt: now.toISOString(),
            trialEndingReminderLastTrialEndsAt: profile.parent.trialEndsAt,
          });
        }
      } else {
        result.trialEnding.skippedCount += 1;
      }
    }

    const deliverySupportReason = getDeliverySupportAlertReason(profile, now);

    if (deliverySupportReason) {
      result.deliverySupport.checkedCount += 1;
      const reasonKey = buildDeliverySupportReasonKey(deliverySupportReason);

      if (profile.parent.deliverySupportAlertLastReasonKey !== reasonKey) {
        const sent = await sendDeliverySupportAlertNotification({
          profile,
          reason: deliverySupportReason,
        });
        countResult(result.deliverySupport, sent);

        if (sent.sent) {
          await updateParentNotificationEmailState(profile.parent.email, {
            deliverySupportAlertLastNotifiedAt: now.toISOString(),
            deliverySupportAlertLastReasonKey: reasonKey,
          });
        }
      } else {
        result.deliverySupport.skippedCount += 1;
      }
    }
  }

  return result;
}
