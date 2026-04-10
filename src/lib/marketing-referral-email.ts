import { buildNotificationEmail } from "./notification-email-design-system";
import {
  getTransactionalNotificationEmailConfig,
  isTransactionalNotificationEmailConfigured,
  sendTransactionalNotificationEmail,
} from "./notification-email-delivery";
import type { MarketingReferralInviteRecord } from "./marketing-referral-store-types";

export type MarketingReferralInviteEmailContent = {
  subject: string;
  html: string;
  text: string;
};

export type MarketingReferralInviteEmailResult = {
  sent: boolean;
  skipped: boolean;
  reason: string | null;
  messageId?: string;
};

function buildStageLabel(invite: MarketingReferralInviteRecord) {
  if (invite.inviteeStageInterest === "MYP") {
    return "MYP families building a calmer reading routine";
  }

  if (invite.inviteeStageInterest === "DP") {
    return "DP families building a calmer argument and TOK routine";
  }

  return "IB families comparing the MYP and DP reading path";
}

export function buildMarketingReferralInviteEmail(input: {
  invite: MarketingReferralInviteRecord;
  appBaseUrl?: string;
}): MarketingReferralInviteEmailContent {
  const appBaseUrl =
    input.appBaseUrl ||
    getTransactionalNotificationEmailConfig()?.appBaseUrl ||
    "https://dailysparks.geledtech.com";
  const starterKitUrl = `${appBaseUrl.replace(/\/+$/, "")}/ib-parent-starter-kit?ref=${encodeURIComponent(
    input.invite.token,
  )}`;
  const email = buildNotificationEmail({
    previewText:
      "A Daily Sparks parent thought this starter kit might help your family compare the MYP and DP reading path.",
    eyebrow: "Growth Education Limited",
    title: "A Daily Sparks parent shared this starter kit with you",
    intro: `Hello ${input.invite.inviteeFullName || "there"}, ${input.invite.referrerParentFullName} thought this Daily Sparks starter kit could help if your family is exploring ${buildStageLabel(input.invite)}.`,
    panels: [
      {
        eyebrow: "Why this helps",
        title: "Start with the calmest first step",
        body: "The starter kit explains how Daily Sparks fits MYP and DP households, what Goodnotes and Notion each do, and which setup step matters first.",
        tone: "primary",
      },
      {
        eyebrow: "What happens next",
        body: "Open the starter kit first. If it feels right, you can then move into the 7-day trial without changing the family workflow you already use.",
        tone: "accent",
      },
    ],
    primaryAction: {
      label: "Open the starter kit",
      href: starterKitUrl,
    },
    supportingNote:
      "Daily Sparks is designed for calmer IB family routines, not another noisy dashboard.",
    signature: "Growth Education Limited",
    footerNote: "Daily Sparks referral invite · lifecycle marketing",
  });

  return {
    subject: "A Daily Sparks parent shared this starter kit with you",
    html: email.html,
    text: email.text,
  };
}

export async function sendMarketingReferralInviteEmail(input: {
  invite: MarketingReferralInviteRecord;
}) {
  if (!isTransactionalNotificationEmailConfigured()) {
    return {
      sent: false,
      skipped: true,
      reason: "Transactional notification email is not configured.",
    } satisfies MarketingReferralInviteEmailResult;
  }

  const email = buildMarketingReferralInviteEmail(input);
  const result = await sendTransactionalNotificationEmail({
    to: input.invite.inviteeEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  return {
    sent: true,
    skipped: false,
    reason: null,
    messageId: result.messageId,
  } satisfies MarketingReferralInviteEmailResult;
}
