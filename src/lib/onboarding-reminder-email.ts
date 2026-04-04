import nodemailer from "nodemailer";

import { formatPreferredDeliveryLocalTime, formatTimeZoneLabel } from "./delivery-locale";
import type { ParentProfile } from "./mvp-types";

type OnboardingReminderEmailConfig = {
  smtpUrl: string;
  fromEmail: string;
  fromName: string;
  appBaseUrl: string;
};

export type OnboardingReminderEmailContent = {
  subject: string;
  html: string;
  text: string;
};

export type OnboardingReminderEmailResult = {
  messageId: string;
  subject: string;
};

function normalizeEnv(value: string | undefined) {
  return value?.trim() || "";
}

function getOnboardingReminderEmailConfig(): OnboardingReminderEmailConfig | null {
  const smtpUrl =
    normalizeEnv(process.env.DAILY_SPARKS_TRANSACTIONAL_SMTP_URL) ||
    normalizeEnv(process.env.GOODNOTES_SMTP_URL);
  const fromEmail =
    normalizeEnv(process.env.DAILY_SPARKS_TRANSACTIONAL_FROM_EMAIL) ||
    normalizeEnv(process.env.GOODNOTES_FROM_EMAIL);
  const fromName =
    normalizeEnv(process.env.DAILY_SPARKS_TRANSACTIONAL_FROM_NAME) ||
    normalizeEnv(process.env.GOODNOTES_FROM_NAME) ||
    "Growth Education";
  const appBaseUrl =
    normalizeEnv(process.env.DAILY_SPARKS_APP_BASE_URL) ||
    "https://dailysparks.geledtech.com";

  if (!smtpUrl || !fromEmail) {
    return null;
  }

  return {
    smtpUrl,
    fromEmail,
    fromName,
    appBaseUrl: appBaseUrl.replace(/\/+$/, ""),
  };
}

export function isOnboardingReminderEmailConfigured() {
  return getOnboardingReminderEmailConfig() !== null;
}

export function buildOnboardingReminderEmail(input: {
  profile: ParentProfile;
  stageIndex: number;
}): OnboardingReminderEmailContent {
  const config = getOnboardingReminderEmailConfig();
  const dashboardUrl = `${config?.appBaseUrl ?? "https://dailysparks.geledtech.com"}/dashboard`;
  const subject =
    input.stageIndex >= 3
      ? "Final reminder: connect Goodnotes to start Daily Sparks"
      : "Connect Goodnotes to start receiving Daily Sparks";
  const localWindow = `${formatPreferredDeliveryLocalTime(
    input.profile.parent.preferredDeliveryLocalTime,
  )} · ${formatTimeZoneLabel(input.profile.parent.deliveryTimeZone)}`;

  const html = `
    <div style="font-family:Helvetica,Arial,sans-serif;background:#f8fafc;padding:32px;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:28px;padding:40px;">
        <p style="margin:0 0 16px;font-size:12px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#b45309;">Growth Education</p>
        <h1 style="margin:0 0 16px;font-size:32px;line-height:1.2;">One last step to start Daily Sparks</h1>
        <p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#475569;">
          Hello ${input.profile.parent.fullName}, your account is ready. Connect Goodnotes so Daily Sparks can begin placing reading briefs into ${input.profile.student.studentName}'s note-taking flow.
        </p>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:20px;padding:20px;margin:24px 0;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#1d4ed8;">Recommended setup</p>
          <p style="margin:0;font-size:15px;line-height:1.7;color:#334155;">
            Connect Goodnotes first. It is the primary delivery path for Daily Sparks. Your current local delivery window is <strong>${localWindow}</strong>.
          </p>
        </div>
        <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#475569;">
          Notion is optional if you would also like an archive workspace, but Goodnotes is the fastest way to start receiving briefs.
        </p>
        <a href="${dashboardUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:999px;padding:14px 24px;font-size:15px;font-weight:700;">
          Connect Goodnotes
        </a>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.7;color:#64748b;">
          Need to update your country, time zone, or delivery time first? You can do that from your Daily Sparks dashboard as well.
        </p>
        <p style="margin:28px 0 0;font-size:14px;color:#334155;">Growth Education Limited</p>
      </div>
    </div>
  `.trim();

  const text = [
    "Growth Education",
    "",
    "One last step to start Daily Sparks",
    "",
    `Hello ${input.profile.parent.fullName}, your account is ready. Connect Goodnotes so Daily Sparks can begin placing reading briefs into ${input.profile.student.studentName}'s note-taking flow.`,
    "",
    `Recommended setup: Connect Goodnotes first. It is the primary delivery path for Daily Sparks. Your current local delivery window is ${localWindow}.`,
    "",
    "Notion is optional if you would also like an archive workspace, but Goodnotes is the fastest way to start receiving briefs.",
    "",
    `Connect Goodnotes: ${dashboardUrl}`,
    "",
    "Growth Education Limited",
  ].join("\n");

  return {
    subject,
    html,
    text,
  };
}

export async function sendOnboardingReminderEmail(input: {
  profile: ParentProfile;
  stageIndex: number;
}): Promise<OnboardingReminderEmailResult> {
  const config = getOnboardingReminderEmailConfig();

  if (!config) {
    throw new Error("Onboarding reminder email is not configured.");
  }

  const email = buildOnboardingReminderEmail(input);
  const transporter = nodemailer.createTransport(config.smtpUrl);
  const result = await transporter.sendMail({
    from: `"${config.fromName}" <${config.fromEmail}>`,
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
