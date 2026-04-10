import type { ParentProfile } from "./mvp-types";
import { buildNotificationEmail } from "./notification-email-design-system";
import {
  getTransactionalNotificationEmailConfig,
  isTransactionalNotificationEmailConfigured,
  sendTransactionalNotificationEmail,
} from "./notification-email-delivery";

export type TrialConversionNurtureEmailContent = {
  subject: string;
  html: string;
  text: string;
};

export type TrialConversionNurtureEmailResult = {
  sent: boolean;
  skipped: boolean;
  reason: string | null;
  messageId?: string;
};

function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function buildProgrammeCopy(profile: ParentProfile) {
  if (profile.student.programme === "MYP") {
    return {
      label: "MYP reading path",
      detail:
        "Daily Sparks is already helping this routine move from bridge reading into inquiry, global context, and compare-connect thinking.",
    };
  }

  if (profile.student.programme === "DP") {
    return {
      label: "DP reading path",
      detail:
        "Daily Sparks is already helping this routine move from abstract framing into claims, evidence limits, and TOK-style follow-through.",
    };
  }

  return {
    label: "Family reading path",
    detail:
      "Daily Sparks is already helping this reading routine become calmer and more durable.",
  };
}

function buildStageCopy(stageIndex: number) {
  if (stageIndex >= 2) {
    return {
      subject: "Keep the Daily Sparks reading rhythm active",
      title: "Keep the reading rhythm active",
      intro:
        "The first brief has already shown the shape of the workflow. This is the moment to keep the routine active before momentum fades.",
      primaryPanelTitle: "Stay with the habit that already started",
      primaryPanelBody:
        "Choosing billing now keeps the brief, notebook, and weekly recap loop moving without interruption.",
    };
  }

  return {
    subject: "Your first brief already did the hardest part",
    title: "Your first brief already proved the setup",
    intro:
      "The hardest part of the trial is not the setup screen. It is reaching the first real brief and seeing the workflow land in a normal family reading day.",
    primaryPanelTitle: "Move from first value into a stable routine",
    primaryPanelBody:
      "If the first brief felt right, billing is what keeps that calm reading rhythm going instead of restarting the evaluation later.",
  };
}

export function buildTrialConversionNurtureEmail(input: {
  profile: ParentProfile;
  stageIndex: number;
  notebookEntryCount: number;
  weeklyRecapCount: number;
  appBaseUrl?: string;
}): TrialConversionNurtureEmailContent {
  const config = getTransactionalNotificationEmailConfig();
  const appBaseUrl =
    input.appBaseUrl ||
    config?.appBaseUrl ||
    "https://dailysparks.geledtech.com";
  const normalizedBaseUrl = appBaseUrl.replace(/\/+$/, "");
  const billingUrl = `${normalizedBaseUrl}/billing`;
  const dashboardUrl = `${normalizedBaseUrl}/dashboard`;
  const programmeCopy = buildProgrammeCopy(input.profile);
  const stageCopy = buildStageCopy(input.stageIndex);
  const notebookLabel = pluralize(
    input.notebookEntryCount,
    "notebook entry",
    "notebook entries",
  );
  const weeklyRecapLabel = pluralize(
    input.weeklyRecapCount,
    "weekly recap",
    "weekly recaps",
  );
  const email = buildNotificationEmail({
    previewText:
      "Daily Sparks is already delivering value. This follow-up is here to help your family decide whether to keep that reading rhythm active.",
    eyebrow: "Growth Education Limited",
    title: stageCopy.title,
    intro: `Hello ${input.profile.parent.fullName}, ${input.profile.student.studentName}'s trial already reached first value. ${stageCopy.intro}`,
    panels: [
      {
        eyebrow: `Stage ${input.stageIndex}`,
        title: stageCopy.primaryPanelTitle,
        body: stageCopy.primaryPanelBody,
        tone: "primary",
      },
      {
        eyebrow: programmeCopy.label,
        body: programmeCopy.detail,
        tone: "accent",
      },
      {
        eyebrow: "Calm progress so far",
        body: `The family already has ${notebookLabel} and ${weeklyRecapLabel} in the workflow. Billing keeps that progress compounding instead of resetting.`,
        tone: "neutral",
      },
    ],
    bodyParagraphs: [
      "This note is not asking your family to learn a new system. It is asking whether the first brief already showed enough value to keep the habit active.",
      `You can review billing from ${billingUrl} and return to the dashboard at ${dashboardUrl}.`,
    ],
    primaryAction: {
      label: "Keep Daily Sparks active",
      href: billingUrl,
    },
    supportingNote:
      "If you have already chosen billing, you can ignore this message. Daily Sparks will stop this nurture loop once paid activation is confirmed.",
    signature: "Growth Education Limited",
    footerNote: `Daily Sparks trial conversion nurture · stage ${input.stageIndex}`,
  });

  return {
    subject: stageCopy.subject,
    html: email.html,
    text: email.text,
  };
}

export async function sendTrialConversionNurtureEmail(input: {
  profile: ParentProfile;
  stageIndex: number;
  notebookEntryCount: number;
  weeklyRecapCount: number;
}) {
  if (!isTransactionalNotificationEmailConfigured()) {
    return {
      sent: false,
      skipped: true,
      reason: "Transactional notification email is not configured.",
    } satisfies TrialConversionNurtureEmailResult;
  }

  const email = buildTrialConversionNurtureEmail(input);
  const result = await sendTransactionalNotificationEmail({
    to: input.profile.parent.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  return {
    sent: true,
    skipped: false,
    reason: null,
    messageId: result.messageId,
  } satisfies TrialConversionNurtureEmailResult;
}
