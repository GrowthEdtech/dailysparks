import { buildNotificationEmail } from "./notification-email-design-system";
import {
  getTransactionalNotificationEmailConfig,
  isTransactionalNotificationEmailConfigured,
  sendTransactionalNotificationEmail,
} from "./notification-email-delivery";
import type { MarketingLeadRecord, MarketingLeadStageInterest } from "./marketing-lead-store-types";

export type MarketingLeadNurtureEmailContent = {
  subject: string;
  html: string;
  text: string;
};

export type MarketingLeadNurtureEmailResult = {
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

function buildStageCopy(stageIndex: number) {
  if (stageIndex === 1) {
    return {
      subject: "Your next step after the Daily Sparks starter kit",
      title: "Your next step is simpler than it looks",
      intro:
        "If the starter kit made sense, the next move is not more research. It is starting the trial so the first brief can show the daily workflow in context.",
      body: "Open the parent setup, connect the family workflow, and let the first brief do the explanation work.",
    };
  }

  if (stageIndex === 2) {
    return {
      subject: "See how Daily Sparks turns a guide into a daily reading routine",
      title: "The fastest path to first value is still the first brief",
      intro:
        "Most families do not need a complex setup. They need one calm reading loop, one delivery channel, and one notebook or recap moment that proves the habit can stick.",
      body: "Start the trial, reach the first brief, and see how Goodnotes, Notion, and the weekly recap layer fit together.",
    };
  }

  return {
    subject: "Last reminder: start your Daily Sparks 7-day trial",
    title: "Last reminder before we close this starter-kit loop",
    intro:
      "You already have the guide. The remaining step is deciding whether Daily Sparks fits your family rhythm in practice.",
    body: "Start your 7-day trial, let the first brief arrive, and judge the workflow from a real family reading day.",
  };
}

export function buildMarketingLeadNurtureEmail(input: {
  lead: MarketingLeadRecord;
  stageIndex: number;
  appBaseUrl?: string;
}): MarketingLeadNurtureEmailContent {
  const appBaseUrl =
    input.appBaseUrl ||
    getTransactionalNotificationEmailConfig()?.appBaseUrl ||
    "https://dailysparks.geledtech.com";
  const loginUrl = `${appBaseUrl.replace(/\/+$/, "")}/login`;
  const stageCopy = buildStageCopy(input.stageIndex);
  const email = buildNotificationEmail({
    previewText:
      "Daily Sparks is ready when your family wants to move from the starter kit into the first reading loop.",
    eyebrow: "Growth Education Limited",
    title: stageCopy.title,
    intro: `Hello ${input.lead.fullName || "there"}, this follow-up is for ${buildStageLabel(input.lead.childStageInterest)}. ${stageCopy.intro}`,
    panels: [
      {
        eyebrow: `Stage ${input.stageIndex}`,
        title: "Move from guide to trial",
        body: stageCopy.body,
        tone: "primary",
      },
      {
        eyebrow: "What happens next",
        body: "Once the trial starts, the product can guide the first brief, notebook save, and weekly recap without asking the family to learn a new system all at once.",
        tone: "accent",
      },
    ],
    bulletSections: [
      {
        title: "What you unlock in the trial",
        items: [
          "A daily brief aligned to MYP bridge reading or DP academic framing",
          "A calmer family workflow across Goodnotes delivery and Notion archive",
          "Notebook and weekly recap moments that show whether the habit is working",
        ],
      },
    ],
    primaryAction: {
      label: "Start your 7-day trial",
      href: loginUrl,
    },
    supportingNote:
      "If you already started the trial, you can ignore this message. The nurture loop will stop once Daily Sparks sees a matching parent profile.",
    signature: "Growth Education Limited",
    footerNote: `Daily Sparks nurture · stage ${input.stageIndex}`,
  });

  return {
    subject: stageCopy.subject,
    html: email.html,
    text: email.text,
  };
}

export async function sendMarketingLeadNurtureEmail(input: {
  lead: MarketingLeadRecord;
  stageIndex: number;
}) {
  if (!isTransactionalNotificationEmailConfigured()) {
    return {
      sent: false,
      skipped: true,
      reason: "Transactional notification email is not configured.",
    } satisfies MarketingLeadNurtureEmailResult;
  }

  const email = buildMarketingLeadNurtureEmail(input);
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
  } satisfies MarketingLeadNurtureEmailResult;
}
