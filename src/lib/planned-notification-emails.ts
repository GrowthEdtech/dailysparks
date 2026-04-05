import {
  formatPreferredDeliveryLocalTime,
  formatTimeZoneLabel,
} from "./delivery-locale";
import type { ParentProfile } from "./mvp-types";
import {
  buildNotificationEmail,
} from "./notification-email-design-system";
import {
  getNotificationEmailPolicy,
  type NotificationEmailPolicy,
} from "./notification-email-policy";
import {
  getTransactionalNotificationEmailConfig,
  sendTransactionalNotificationEmail,
} from "./notification-email-delivery";

export type PlannedNotificationEmailContent = {
  subject: string;
  html: string;
  text: string;
};

export type PlannedNotificationSendResult = {
  sent: boolean;
  skipped: boolean;
  reason: string | null;
  messageId?: string;
  subject?: string;
};

type PlannedNotificationBuilderInput = {
  profile: ParentProfile;
  appBaseUrl?: string;
};

type BillingStatusUpdateEmailInput = PlannedNotificationBuilderInput & {
  invoiceStatus: string | null;
};

type DeliverySupportAlertEmailInput = PlannedNotificationBuilderInput & {
  reason: string;
};

export const TRIAL_ENDING_REMINDER_EMAIL_POLICY = getNotificationEmailPolicy(
  "trial-ending-reminder",
);
export const BILLING_STATUS_UPDATE_EMAIL_POLICY = getNotificationEmailPolicy(
  "billing-status-update",
);
export const DELIVERY_SUPPORT_ALERT_EMAIL_POLICY = getNotificationEmailPolicy(
  "delivery-support-alert",
);

function getAppBaseUrl(appBaseUrl?: string) {
  return (
    appBaseUrl ||
    getTransactionalNotificationEmailConfig()?.appBaseUrl ||
    "https://dailysparks.geledtech.com"
  ).replace(/\/+$/, "");
}

function formatDate(value: string | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatInvoiceStatusLabel(status: string | null) {
  if (status === "paid") {
    return "Payment confirmed";
  }

  if (status === "payment_failed" || status === "open") {
    return "Payment needs attention";
  }

  if (!status) {
    return "Billing update";
  }

  return status
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function buildFooterNote(policy: NotificationEmailPolicy) {
  return `${policy.label} · ${policy.renderMode}`;
}

export function buildTrialEndingReminderEmail(
  input: PlannedNotificationBuilderInput,
): PlannedNotificationEmailContent {
  const appBaseUrl = getAppBaseUrl(input.appBaseUrl);
  const billingUrl = `${appBaseUrl}/billing`;
  const trialEndDate = formatDate(input.profile.parent.trialEndsAt);

  const email = buildNotificationEmail({
    previewText:
      "Your Daily Sparks trial is close to ending. Choose billing to keep daily reading delivery active.",
    eyebrow: "Growth Education Limited",
    title: "Your trial is close to ending",
    intro: `Hello ${input.profile.parent.fullName}, ${input.profile.student.studentName}'s Daily Sparks trial currently ends on ${trialEndDate}. Choose billing before that date to keep delivery active without interruption.`,
    panels: [
      {
        eyebrow: "Trial timeline",
        title: "Choose billing before the trial ends",
        body: `Your current trial ends on ${trialEndDate}. Once billing is selected, Daily Sparks can continue without pausing your reading rhythm.`,
        tone: "accent",
      },
    ],
    bodyParagraphs: [
      "This reminder is meant to be lightweight: one clear next step, then your family can keep using the same dashboard and delivery setup you already have.",
    ],
    primaryAction: {
      label: "Review billing",
      href: billingUrl,
    },
    signature: "Growth Education Limited",
    footerNote: buildFooterNote(TRIAL_ENDING_REMINDER_EMAIL_POLICY),
  });

  return {
    subject: "Your Daily Sparks trial ends soon",
    html: email.html,
    text: email.text,
  };
}

export function buildBillingStatusUpdateEmail(
  input: BillingStatusUpdateEmailInput,
): PlannedNotificationEmailContent {
  const appBaseUrl = getAppBaseUrl(input.appBaseUrl);
  const invoiceUrl =
    input.profile.parent.latestInvoiceHostedUrl || `${appBaseUrl}/billing`;
  const invoiceLabel =
    input.profile.parent.latestInvoiceNumber || input.profile.parent.latestInvoiceId;
  const invoiceStatusLabel = formatInvoiceStatusLabel(input.invoiceStatus);
  const paymentConfirmed = input.invoiceStatus === "paid";

  const email = buildNotificationEmail({
    previewText:
      "A Daily Sparks billing update is ready with the latest invoice and next-step details.",
    eyebrow: "Growth Education Limited",
    title: paymentConfirmed
      ? "Your payment is confirmed"
      : "Your billing status needs attention",
    intro: paymentConfirmed
      ? `Hello ${input.profile.parent.fullName}, we've recorded your latest Daily Sparks payment and refreshed your billing summary.`
      : `Hello ${input.profile.parent.fullName}, Daily Sparks has a billing update that needs your review so access stays uninterrupted.`,
    panels: [
      {
        eyebrow: "Invoice status",
        title: invoiceStatusLabel,
        body: invoiceLabel
          ? `Invoice ${invoiceLabel} is the latest Stripe record attached to your account.`
          : "A new Stripe billing record is attached to your account.",
        tone: paymentConfirmed ? "primary" : "accent",
      },
    ],
    bulletSections: [
      {
        title: "Billing snapshot",
        items: [
          invoiceLabel ? `Invoice: ${invoiceLabel}` : "Invoice: latest record",
          input.profile.parent.latestInvoiceAmountPaid !== null &&
          input.profile.parent.latestInvoiceCurrency
            ? `Amount: ${new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: input.profile.parent.latestInvoiceCurrency.toUpperCase(),
              }).format(input.profile.parent.latestInvoiceAmountPaid / 100)}`
            : "Amount: review the invoice record",
          input.profile.parent.latestInvoicePaidAt
            ? `Recorded on: ${formatDate(input.profile.parent.latestInvoicePaidAt)}`
            : "Recorded on: latest Stripe event",
        ],
      },
    ],
    primaryAction: {
      label: "View invoice",
      href: invoiceUrl,
    },
    supportingNote: paymentConfirmed
      ? "If you also want to change cadence or cancel later, you can still do that from billing."
      : "If the payment issue has already been resolved, reopening the invoice is still the fastest way to confirm the latest state.",
    signature: "Growth Education Limited",
    footerNote: buildFooterNote(BILLING_STATUS_UPDATE_EMAIL_POLICY),
  });

  return {
    subject: paymentConfirmed
      ? "Daily Sparks payment confirmed"
      : "Daily Sparks billing needs attention",
    html: email.html,
    text: email.text,
  };
}

export function buildDeliverySupportAlertEmail(
  input: DeliverySupportAlertEmailInput,
): PlannedNotificationEmailContent {
  const appBaseUrl = getAppBaseUrl(input.appBaseUrl);
  const dashboardUrl = `${appBaseUrl}/dashboard`;
  const localWindow = `${formatPreferredDeliveryLocalTime(
    input.profile.parent.preferredDeliveryLocalTime,
  )} · ${formatTimeZoneLabel(input.profile.parent.deliveryTimeZone)}`;

  const email = buildNotificationEmail({
    previewText:
      "Your Daily Sparks delivery setup needs attention so the next brief can land in the right place.",
    eyebrow: "Growth Education Limited",
    title: "Your delivery setup needs attention",
    intro: `Hello ${input.profile.parent.fullName}, ${input.profile.student.studentName}'s Daily Sparks delivery flow needs one more check before the next reading brief can land on time.`,
    panels: [
      {
        eyebrow: "Current issue",
        body: input.reason,
        tone: "accent",
      },
      {
        eyebrow: "Preferred delivery window",
        body: `Your current local delivery window is ${localWindow}.`,
        tone: "primary",
      },
    ],
    primaryAction: {
      label: "Review delivery setup",
      href: dashboardUrl,
    },
    supportingNote:
      "Open the dashboard to reconnect Goodnotes or Notion, update delivery details, or confirm the channel your family wants to use.",
    signature: "Growth Education Limited",
    footerNote: buildFooterNote(DELIVERY_SUPPORT_ALERT_EMAIL_POLICY),
  });

  return {
    subject: "Your Daily Sparks delivery setup needs attention",
    html: email.html,
    text: email.text,
  };
}

async function sendPlannedNotificationEmail(input: {
  to: string;
  email: PlannedNotificationEmailContent;
}): Promise<PlannedNotificationSendResult> {
  if (!getTransactionalNotificationEmailConfig()) {
    return {
      sent: false,
      skipped: true,
      reason: "Transactional notification email is not configured.",
    };
  }

  const result = await sendTransactionalNotificationEmail({
    to: input.to,
    subject: input.email.subject,
    html: input.email.html,
    text: input.email.text,
  });

  return {
    sent: true,
    skipped: false,
    reason: null,
    messageId: result.messageId,
    subject: input.email.subject,
  };
}

export async function sendTrialEndingReminderNotification(input: {
  profile: ParentProfile;
}): Promise<PlannedNotificationSendResult> {
  return sendPlannedNotificationEmail({
    to: input.profile.parent.email,
    email: buildTrialEndingReminderEmail({ profile: input.profile }),
  });
}

export async function sendBillingStatusUpdateNotification(input: {
  profile: ParentProfile;
  invoiceStatus: string | null;
}): Promise<PlannedNotificationSendResult> {
  return sendPlannedNotificationEmail({
    to: input.profile.parent.email,
    email: buildBillingStatusUpdateEmail({
      profile: input.profile,
      invoiceStatus: input.invoiceStatus,
    }),
  });
}

export async function sendDeliverySupportAlertNotification(input: {
  profile: ParentProfile;
  reason: string;
}): Promise<PlannedNotificationSendResult> {
  return sendPlannedNotificationEmail({
    to: input.profile.parent.email,
    email: buildDeliverySupportAlertEmail({
      profile: input.profile,
      reason: input.reason,
    }),
  });
}
