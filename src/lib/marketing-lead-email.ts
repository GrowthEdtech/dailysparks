import { buildNotificationEmail } from "./notification-email-design-system";
import {
  getTransactionalNotificationEmailConfig,
  isTransactionalNotificationEmailConfigured,
  sendTransactionalNotificationEmail,
} from "./notification-email-delivery";
import type {
  MarketingLeadRecord,
  MarketingLeadStageInterest,
} from "./marketing-lead-store-types";

export type MarketingLeadEmailContent = {
  subject: string;
  html: string;
  text: string;
};

export type MarketingLeadEmailResult = {
  sent: boolean;
  skipped: boolean;
  reason: string | null;
  messageId?: string;
};

function buildStageLabel(stageInterest: MarketingLeadStageInterest) {
  if (stageInterest === "MYP") {
    return "MYP families building bridge reading habits";
  }

  if (stageInterest === "DP") {
    return "DP families building argument and TOK habits";
  }

  return "Families comparing the MYP and DP reading path";
}

export function buildMarketingLeadStarterKitEmail(input: {
  lead: MarketingLeadRecord;
  appBaseUrl?: string;
}): MarketingLeadEmailContent {
  const appBaseUrl =
    input.appBaseUrl ||
    getTransactionalNotificationEmailConfig()?.appBaseUrl ||
    "https://dailysparks.geledtech.com";
  const starterKitUrl = `${appBaseUrl.replace(/\/+$/, "")}/ib-parent-starter-kit`;
  const email = buildNotificationEmail({
    previewText:
      "Your Daily Sparks IB Parent Starter Kit is ready with the MYP / DP reading model, setup steps, and next actions.",
    eyebrow: "Growth Education Limited",
    title: "Your IB Parent Starter Kit is ready",
    intro: `Hello ${input.lead.fullName || "there"}, here is your Daily Sparks starter kit for ${buildStageLabel(input.lead.childStageInterest)}.`,
    panels: [
      {
        eyebrow: "What is inside",
        title: "Start with the calmest path to value",
        body: "The starter kit explains how Daily Sparks fits MYP and DP households, what Goodnotes and Notion each do, and which first setup step matters most.",
        tone: "primary",
      },
      {
        eyebrow: "Best next move",
        body: "Use the starter kit to decide whether you should start with the MYP guide, the DP guide, or go straight into a 7-day trial.",
        tone: "accent",
      },
    ],
    bulletSections: [
      {
        title: "Starter kit highlights",
        items: [
          "What changes between MYP bridge reading and DP academic framing",
          "How Goodnotes delivery and Notion archive fit the family workflow",
          "The fastest setup path before starting a trial",
        ],
      },
    ],
    primaryAction: {
      label: "Open the starter kit",
      href: starterKitUrl,
    },
    supportingNote:
      "When you are ready, the trial path stays simple: connect the delivery workflow first, then let the first brief and notebook loop do the rest.",
    signature: "Growth Education Limited",
    footerNote: "Daily Sparks starter kit · lifecycle marketing",
  });

  return {
    subject: "Your Daily Sparks IB Parent Starter Kit",
    html: email.html,
    text: email.text,
  };
}

export async function sendMarketingLeadStarterKitEmail(input: {
  lead: MarketingLeadRecord;
}) {
  if (!isTransactionalNotificationEmailConfigured()) {
    return {
      sent: false,
      skipped: true,
      reason: "Transactional notification email is not configured.",
    } satisfies MarketingLeadEmailResult;
  }

  const email = buildMarketingLeadStarterKitEmail(input);
  const result = await sendTransactionalNotificationEmail({
    to: input.lead.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  return {
    sent: true,
    skipped: false,
    reason: null,
    messageId: result.messageId,
  } satisfies MarketingLeadEmailResult;
}
