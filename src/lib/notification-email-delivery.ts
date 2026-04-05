import nodemailer from "nodemailer";

export type TransactionalNotificationEmailConfig = {
  smtpUrl: string;
  fromEmail: string;
  fromName: string;
  appBaseUrl: string;
};

export type TransactionalNotificationEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type TransactionalNotificationEmailResult = {
  messageId: string;
};

function normalizeEnv(value: string | undefined) {
  return value?.trim() || "";
}

export function getTransactionalNotificationEmailConfig():
  | TransactionalNotificationEmailConfig
  | null {
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

export function isTransactionalNotificationEmailConfigured() {
  return getTransactionalNotificationEmailConfig() !== null;
}

export async function sendTransactionalNotificationEmail(
  input: TransactionalNotificationEmailInput,
): Promise<TransactionalNotificationEmailResult> {
  const config = getTransactionalNotificationEmailConfig();

  if (!config) {
    throw new Error("Transactional notification email is not configured.");
  }

  const transporter = nodemailer.createTransport(config.smtpUrl);
  const result = await transporter.sendMail({
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  return {
    messageId: result.messageId,
  };
}
