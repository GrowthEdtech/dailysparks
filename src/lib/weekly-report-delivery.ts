import nodemailer from "nodemailer";
import { renderWeeklyProgressReportTypst } from "./outbound-weekly-report-typst";
import type { WeeklyProgressReportRecord } from "./weekly-report-schema";
import type { ParentProfile } from "./mvp-types";

type MailConfig = {
  smtpUrl: string;
  fromEmail: string;
  fromName: string;
};

function getMailConfig(): MailConfig | null {
  const smtpUrl = process.env.GOODNOTES_SMTP_URL;
  const fromEmail = process.env.GOODNOTES_FROM_EMAIL;
  const fromName = process.env.GOODNOTES_FROM_NAME || "Daily Sparks";

  if (!smtpUrl || !fromEmail) return null;
  return { smtpUrl, fromEmail, fromName };
}

export async function sendWeeklyProgressReportEmail(
  profile: ParentProfile,
  report: WeeklyProgressReportRecord
) {
  const config = getMailConfig();
  if (!config) throw new Error("Mail is not configured.");

  const { pdf, fileName } = await renderWeeklyProgressReportTypst(report);
  const transporter = nodemailer.createTransport(config.smtpUrl);

  const result = await transporter.sendMail({
    to: profile.parent.email,
    from: `"${config.fromName}" <${config.fromEmail}>`,
    subject: `[Academic Growth Report] Weekly Progress for ${profile.student.studentName}`,
    text: `Hi ${profile.parent.fullName},\n\nAttached is the Weekly Progress Report for ${profile.student.studentName} (${report.weekRangeLabel}).\n\nThis report summarizes the topics covered, concepts mastered, and critical thinking development this week.\n\nBest regards,\nDaily Sparks Team`,
    attachments: [
      {
        filename: fileName,
        content: Buffer.from(pdf),
        contentType: "application/pdf",
      },
    ],
  });

  return { messageId: result.messageId };
}
