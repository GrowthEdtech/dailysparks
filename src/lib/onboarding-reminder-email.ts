import { formatPreferredDeliveryLocalTime, formatTimeZoneLabel } from "./delivery-locale";
import type { ParentProfile } from "./mvp-types";
import { buildNotificationEmail } from "./notification-email-design-system";
import {
  getTransactionalNotificationEmailConfig,
  isTransactionalNotificationEmailConfigured,
  sendTransactionalNotificationEmail,
} from "./notification-email-delivery";
import { getNotificationEmailPolicy } from "./notification-email-policy";

export type OnboardingReminderEmailContent = {
  subject: string;
  html: string;
  text: string;
};

export type OnboardingReminderEmailResult = {
  messageId: string;
  subject: string;
};

export const ONBOARDING_REMINDER_EMAIL_POLICY = getNotificationEmailPolicy(
  "onboarding-reminder",
);

export function isOnboardingReminderEmailConfigured() {
  return isTransactionalNotificationEmailConfigured();
}

export function buildOnboardingReminderEmail(input: {
  profile: ParentProfile;
  stageIndex: number;
}): OnboardingReminderEmailContent {
  const config = getTransactionalNotificationEmailConfig();
  const dashboardUrl = `${config?.appBaseUrl ?? "https://dailysparks.geledtech.com"}/dashboard`;
  const subject =
    input.stageIndex >= 3
      ? "Final reminder: connect Goodnotes to start Daily Sparks"
      : "Connect Goodnotes to start receiving Daily Sparks";
  const localWindow = `${formatPreferredDeliveryLocalTime(
    input.profile.parent.preferredDeliveryLocalTime,
  )} · ${formatTimeZoneLabel(input.profile.parent.deliveryTimeZone)}`;

  const email = buildNotificationEmail({
    previewText:
      "Connect Goodnotes to start receiving Daily Sparks in your family's preferred reading rhythm.",
    eyebrow: "Growth Education Limited",
    title: "Your setup is almost ready",
    intro: `Hello ${input.profile.parent.fullName}, your account is ready. Connect Goodnotes so Daily Sparks can begin placing each reading brief into ${input.profile.student.studentName}'s note-taking flow.`,
    panels: [
      {
        eyebrow: "Recommended first step",
        body: "Connect Goodnotes first. It is the primary delivery path for Daily Sparks, and it gives your family the simplest start.",
        tone: "primary",
      },
      {
        eyebrow: "Delivery window",
        body: `Your current local delivery window is ${localWindow}.`,
        tone: "accent",
      },
    ],
    bodyParagraphs: [
      "Notion is optional if you would also like an archive workspace, but Goodnotes is the fastest way to start receiving briefs.",
    ],
    primaryAction: {
      label: "Connect Goodnotes",
      href: dashboardUrl,
    },
    supportingNote:
      "Need to update your country, time zone, or delivery time first? You can do that from your Daily Sparks dashboard as well. This email is meant to leave you with a single next step.",
    signature: "Growth Education Limited",
    footerNote: `${ONBOARDING_REMINDER_EMAIL_POLICY.label} · ${ONBOARDING_REMINDER_EMAIL_POLICY.renderMode}`,
  });

  return {
    subject,
    html: email.html,
    text: email.text,
  };
}

export async function sendOnboardingReminderEmail(input: {
  profile: ParentProfile;
  stageIndex: number;
}): Promise<OnboardingReminderEmailResult> {
  if (!isTransactionalNotificationEmailConfigured()) {
    throw new Error("Onboarding reminder email is not configured.");
  }

  const email = buildOnboardingReminderEmail(input);
  const result = await sendTransactionalNotificationEmail({
    to: input.profile.parent.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  return {
    messageId: result.messageId,
    subject: email.subject,
  };
}
