import { updateParentNotificationEmailState } from "./mvp-store";
import type { ParentProfile } from "./mvp-types";
import {
  sendBillingStatusUpdateNotification,
  type PlannedNotificationSendResult,
} from "./planned-notification-emails";

export async function maybeSendBillingStatusNotification(input: {
  profile: ParentProfile;
  invoiceId: string | null;
  invoiceStatus: string | null;
  now?: Date;
}): Promise<PlannedNotificationSendResult> {
  const invoiceId = input.invoiceId?.trim() || null;
  const invoiceStatus = input.invoiceStatus?.trim() || null;

  if (!invoiceId || !invoiceStatus) {
    return {
      sent: false,
      skipped: true,
      reason: "No invoice id or status is available for notification.",
    };
  }

  if (
    input.profile.parent.billingStatusNotificationLastInvoiceId === invoiceId &&
    input.profile.parent.billingStatusNotificationLastInvoiceStatus ===
      invoiceStatus
  ) {
    return {
      sent: false,
      skipped: true,
      reason: "This invoice status notification was already sent.",
    };
  }

  const result = await sendBillingStatusUpdateNotification({
    profile: input.profile,
    invoiceStatus,
  });

  if (result.sent) {
    await updateParentNotificationEmailState(input.profile.parent.email, {
      billingStatusNotificationLastSentAt: (
        input.now ?? new Date()
      ).toISOString(),
      billingStatusNotificationLastInvoiceId: invoiceId,
      billingStatusNotificationLastInvoiceStatus: invoiceStatus,
    });
  }

  return result;
}
