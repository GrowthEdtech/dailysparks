import type { ParentProfile } from "./mvp-types";
import type {
  DailyBriefNotebookWeeklyRecap,
} from "./daily-brief-notebook-weekly-recap";
import { buildNotificationEmail } from "./notification-email-design-system";
import {
  getTransactionalNotificationEmailConfig,
  isTransactionalNotificationEmailConfigured,
  sendTransactionalNotificationEmail,
} from "./notification-email-delivery";

export type DailyBriefNotebookWeeklyRecapEmailContent = {
  subject: string;
  html: string;
  text: string;
};

export type DailyBriefNotebookWeeklyRecapEmailResult = {
  messageId: string;
  subject: string;
};

function getAppBaseUrl(appBaseUrl?: string) {
  return (
    appBaseUrl ||
    getTransactionalNotificationEmailConfig()?.appBaseUrl ||
    "https://dailysparks.geledtech.com"
  ).replace(/\/+$/, "");
}

function getProgrammeLabel(programme: ParentProfile["student"]["programme"]) {
  return programme === "DP" ? "DP" : "MYP";
}

export function isDailyBriefNotebookWeeklyRecapEmailConfigured() {
  return isTransactionalNotificationEmailConfigured();
}

export function buildDailyBriefNotebookWeeklyRecapEmail(input: {
  profile: ParentProfile;
  recap: DailyBriefNotebookWeeklyRecap;
  appBaseUrl?: string;
}): DailyBriefNotebookWeeklyRecapEmailContent {
  const appBaseUrl = getAppBaseUrl(input.appBaseUrl);
  const dashboardUrl = `${appBaseUrl}/dashboard`;
  const subject = `Your Daily Sparks weekly recap is ready · ${input.recap.weekLabel}`;
  const retrievalPromptItems = input.recap.retrievalPrompts
    .slice(0, 3)
    .map((prompt) => `${prompt.title}: ${prompt.prompt}`);

  const email = buildNotificationEmail({
    previewText: `Your ${getProgrammeLabel(input.recap.programme)} weekly recap is ready with a few prompts to revisit this week.`,
    eyebrow: "Growth Education Limited",
    title: "Weekly notebook recap",
    intro: `Hello ${input.profile.parent.fullName}, ${input.profile.student.studentName}'s ${getProgrammeLabel(
      input.recap.programme,
    )} weekly recap for ${input.recap.weekLabel} is ready.`,
    panels: [
      {
        eyebrow: "This week",
        title: input.recap.weekLabel,
        body: input.recap.summaryLines[0] ?? "Your family's notebook recap is ready to review.",
        tone: "primary",
      },
      {
        eyebrow: "Focus tags",
        body:
          input.recap.topTags.length > 0
            ? input.recap.topTags.join(" · ")
            : "This week's recap is organized around your saved notebook ideas.",
        tone: "accent",
      },
    ],
    bodyParagraphs: input.recap.summaryLines.slice(1),
    bulletSections: retrievalPromptItems.length
      ? [
          {
            title: "Retrieval prompts",
            items: retrievalPromptItems,
          },
        ]
      : [],
    primaryAction: {
      label: "Open notebook dashboard",
      href: dashboardUrl,
    },
    supportingNote:
      "This email is meant to be a light weekly recall nudge. Use the dashboard to revisit the full recap, saved responses, and your notebook history.",
    signature: "Growth Education Limited",
    footerNote: "Weekly notebook recap · html-notification",
  });

  return {
    subject,
    html: email.html,
    text: email.text,
  };
}

export async function sendDailyBriefNotebookWeeklyRecapEmail(input: {
  profile: ParentProfile;
  recap: DailyBriefNotebookWeeklyRecap;
  appBaseUrl?: string;
}): Promise<DailyBriefNotebookWeeklyRecapEmailResult> {
  if (!isDailyBriefNotebookWeeklyRecapEmailConfigured()) {
    throw new Error("Weekly recap email is not configured.");
  }

  const email = buildDailyBriefNotebookWeeklyRecapEmail(input);
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
