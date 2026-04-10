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

function getProgrammeActivationCopy(profile: ParentProfile) {
  if (profile.student.programme === "MYP") {
    return {
      label: "MYP reading path",
      detail:
        "Goodnotes is where Daily Sparks can begin training global context, compare-connect thinking, and inquiry momentum without overwhelming the student.",
    };
  }

  if (profile.student.programme === "DP") {
    return {
      label: "DP reading path",
      detail:
        "Goodnotes is where Daily Sparks can begin training abstract framing, claim and counterpoint structure, and TOK-style follow-through in the reading routine.",
    };
  }

  return {
    label: "Family reading path",
    detail:
      "Goodnotes is the simplest way to begin the Daily Sparks reading routine before you add any secondary archive or recap layer.",
  };
}

function getStageEmailCopy(input: {
  profile: ParentProfile;
  stageIndex: number;
  localWindow: string;
}) {
  const programmeCopy = getProgrammeActivationCopy(input.profile);

  if (input.stageIndex >= 3) {
    return {
      subject: "Final reminder: connect Goodnotes to start Daily Sparks",
      title: "Your setup is still one step away",
      intro: `Hello ${input.profile.parent.fullName}, Daily Sparks is ready for ${input.profile.student.studentName}. The only missing step is connecting Goodnotes so the first reading brief can actually arrive.`,
      panels: [
        {
          eyebrow: "Final activation step",
          title: "Connect Goodnotes now",
          body: "Once Goodnotes is connected, Daily Sparks can stop nudging and start delivering. Keep this final step simple so the reading loop begins this week.",
          tone: "primary" as const,
        },
        {
          eyebrow: programmeCopy.label,
          body: programmeCopy.detail,
          tone: "accent" as const,
        },
      ],
      bodyParagraphs: [
        `Your current delivery window is ${input.localWindow}.`,
        "Notion can stay optional for now. The priority is letting the first brief land in the student's real reading flow.",
      ],
    };
  }

  if (input.stageIndex === 2) {
    return {
      subject: "Keep the Daily Sparks reading routine moving",
      title: "Your reading routine is ready to begin",
      intro: `Hello ${input.profile.parent.fullName}, your family already has the account. Connecting Goodnotes now is what turns that setup into the first Daily Sparks reading routine for ${input.profile.student.studentName}.`,
      panels: [
        {
          eyebrow: "Why this matters now",
          title: "Move from setup to first value",
          body: "The fastest path to value is still the same: connect Goodnotes, receive the first brief, and let the student start the reading loop before adding anything else.",
          tone: "primary" as const,
        },
        {
          eyebrow: programmeCopy.label,
          body: programmeCopy.detail,
          tone: "accent" as const,
        },
      ],
      bodyParagraphs: [
        `Your current delivery window is ${input.localWindow}.`,
        "Notion remains optional. Goodnotes is the piece that unlocks the first brief and the first notebook habit.",
      ],
    };
  }

  return {
    subject: "Connect Goodnotes to start receiving Daily Sparks",
    title: "Your setup is almost ready",
    intro: `Hello ${input.profile.parent.fullName}, your account is ready. Connect Goodnotes so Daily Sparks can begin placing each reading brief into ${input.profile.student.studentName}'s note-taking flow.`,
    panels: [
      {
        eyebrow: "Recommended first step",
        body: "Connect Goodnotes first. It is the primary delivery path for Daily Sparks, and it gives your family the simplest start.",
        tone: "primary" as const,
      },
      {
        eyebrow: "Delivery window",
        body: `Your current local delivery window is ${input.localWindow}.`,
        tone: "accent" as const,
      },
    ],
    bodyParagraphs: [
      "Notion is optional if you would also like an archive workspace, but Goodnotes is the fastest way to start receiving briefs.",
    ],
  };
}

export function buildOnboardingReminderEmail(input: {
  profile: ParentProfile;
  stageIndex: number;
}): OnboardingReminderEmailContent {
  const config = getTransactionalNotificationEmailConfig();
  const dashboardUrl = `${config?.appBaseUrl ?? "https://dailysparks.geledtech.com"}/dashboard`;
  const localWindow = `${formatPreferredDeliveryLocalTime(
    input.profile.parent.preferredDeliveryLocalTime,
  )} · ${formatTimeZoneLabel(input.profile.parent.deliveryTimeZone)}`;
  const stageCopy = getStageEmailCopy({
    profile: input.profile,
    stageIndex: input.stageIndex,
    localWindow,
  });

  const email = buildNotificationEmail({
    previewText:
      "Connect Goodnotes to start receiving Daily Sparks in your family's preferred reading rhythm.",
    eyebrow: "Growth Education Limited",
    title: stageCopy.title,
    intro: stageCopy.intro,
    panels: stageCopy.panels,
    bodyParagraphs: stageCopy.bodyParagraphs,
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
    subject: stageCopy.subject,
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
