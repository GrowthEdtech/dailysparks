import nodemailer from "nodemailer";

import type { GeneratedDailyBriefDraft } from "./daily-brief-orchestrator";
import type { DailyBriefRenderAudit } from "./daily-brief-history-schema";
import { buildDailyBriefRenderAudit } from "./daily-brief-render-audit";
import type { ParentProfile } from "./mvp-types";
import {
  buildGoodnotesWelcomeNote,
  type GoodnotesWelcomeNote,
} from "./outbound-goodnotes-welcome-note";
import {
  buildOutboundDailyBriefPacket,
  type OutboundDailyBriefPacketInput,
} from "./outbound-daily-brief-packet";
import { renderGoodnotesWelcomeNoteTypst } from "./outbound-goodnotes-welcome-note-typst";
import { renderOutboundDailyBriefTypstPrototype } from "./outbound-daily-brief-typst";

type GoodnotesDeliveryConfig = {
  smtpUrl: string;
  fromEmail: string;
  fromName: string;
};

export type GoodnotesDeliveryResult = {
  messageId: string;
  attachmentFileName: string;
  renderAudit?: DailyBriefRenderAudit | null;
};

export const DAILY_BRIEF_PDF_RENDERERS = ["typst"] as const;
export type DailyBriefPdfRenderer =
  (typeof DAILY_BRIEF_PDF_RENDERERS)[number];
export type GoodnotesAttachmentMode = "production" | "canary" | "test";

function normalizeEnv(value: string | undefined) {
  return value?.trim() || "";
}

function getGoodnotesDeliveryConfig(): GoodnotesDeliveryConfig | null {
  const smtpUrl = normalizeEnv(process.env.GOODNOTES_SMTP_URL);
  const fromEmail = normalizeEnv(process.env.GOODNOTES_FROM_EMAIL);
  const fromName =
    normalizeEnv(process.env.GOODNOTES_FROM_NAME) || "Daily Sparks";

  if (!smtpUrl || !fromEmail) {
    return null;
  }

  return {
    smtpUrl,
    fromEmail,
    fromName,
  };
}

export function isGoodnotesDeliveryConfigured() {
  return getGoodnotesDeliveryConfig() !== null;
}

function toAsciiSlug(value: string, fallback: string, maxSegments = 8) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    return fallback;
  }

  return slug
    .split("-")
    .filter(Boolean)
    .slice(0, maxSegments)
    .join("-");
}

export { buildGoodnotesWelcomeNote };
export type { GoodnotesWelcomeNote };

function toBriefAttachmentFileName(
  brief: Pick<GeneratedDailyBriefDraft, "programme" | "scheduledFor" | "headline">,
  attachmentMode: GoodnotesAttachmentMode = "production",
) {
  const safeDate = brief.scheduledFor.trim();
  const programme = brief.programme.toUpperCase();
  const topicSlug = toAsciiSlug(brief.headline, "daily-reading");
  const modeSuffix = attachmentMode === "canary" ? "_canary" : "";

  return `${safeDate}_DailySparks_DailyBrief_${programme}_${topicSlug}${modeSuffix}.pdf`;
}

export function buildGoodnotesBriefPacket(
  _profile: ParentProfile,
  brief: GeneratedDailyBriefDraft,
) {
  return buildOutboundDailyBriefPacket(brief);
}

export async function createGoodnotesTestBriefPdf(profile: ParentProfile) {
  const rendered = await renderGoodnotesWelcomeNoteTypst(profile);

  return rendered.pdf;
}

export async function createOutboundDailyBriefPdf(
  brief: OutboundDailyBriefPacketInput,
  options: {
    renderer?: DailyBriefPdfRenderer;
  } = {},
) {
  const renderer = options.renderer ?? "typst";

  if (renderer !== "typst") {
    throw new Error("Only Typst is supported for Daily Brief PDFs.");
  }

  const rendered = await renderOutboundDailyBriefTypstPrototype(brief);

  return rendered.pdf;
}

async function createOutboundDailyBriefPdfWithAudit(
  brief: OutboundDailyBriefPacketInput,
  options: {
    renderer?: DailyBriefPdfRenderer;
  } = {},
) {
  const renderer = options.renderer ?? "typst";
  const pdf = await createOutboundDailyBriefPdf(brief, { renderer });
  const renderAudit = await buildDailyBriefRenderAudit({
    brief,
    pdfBytes: pdf,
    renderer,
  });

  return {
    pdf,
    renderAudit,
  };
}

export async function createGoodnotesBriefPdf(
  _profile: ParentProfile,
  brief: GeneratedDailyBriefDraft,
  options: {
    renderer?: DailyBriefPdfRenderer;
  } = {},
) {
  return createOutboundDailyBriefPdf(brief, {
    renderer: options.renderer ?? "typst",
  });
}

export async function sendTestBriefToGoodnotes(
  profile: ParentProfile,
): Promise<GoodnotesDeliveryResult> {
  const config = getGoodnotesDeliveryConfig();

  if (!config) {
    throw new Error("Goodnotes delivery is not configured yet.");
  }

  const rendered = await renderGoodnotesWelcomeNoteTypst(profile);
  const transporter = nodemailer.createTransport(config.smtpUrl);
  const result = await transporter.sendMail({
    to: profile.student.goodnotesEmail,
    from: `${config.fromName} <${config.fromEmail}>`,
    subject: `Welcome to Daily Sparks for ${profile.student.studentName}`,
    text: [
      `Hi ${profile.parent.fullName},`,
      "",
      "Attached is your Daily Sparks welcome note from Growth Education Limited.",
      "This file also confirms that your Goodnotes destination is ready for future Daily Sparks delivery.",
      "",
      "Growth Education Limited",
    ].join("\n"),
    attachments: [
      {
        filename: rendered.fileName,
        content: Buffer.from(rendered.pdf),
        contentType: "application/pdf",
      },
    ],
  });

  return {
    messageId: result.messageId,
    attachmentFileName: rendered.fileName,
  };
}

export async function sendBriefToGoodnotes(
  profile: ParentProfile,
  brief: GeneratedDailyBriefDraft,
  options: {
    attachmentMode?: Extract<GoodnotesAttachmentMode, "production" | "canary">;
    renderer?: DailyBriefPdfRenderer;
  } = {},
): Promise<GoodnotesDeliveryResult> {
  const config = getGoodnotesDeliveryConfig();

  if (!config) {
    throw new Error("Goodnotes delivery is not configured yet.");
  }

  const renderer = options.renderer ?? "typst";
  const attachmentFileName = toBriefAttachmentFileName(
    brief,
    options.attachmentMode ?? "production",
  );
  const { pdf, renderAudit } = await createOutboundDailyBriefPdfWithAudit(brief, {
    renderer,
  });
  const transporter = nodemailer.createTransport(config.smtpUrl);
  const result = await transporter.sendMail({
    to: profile.student.goodnotesEmail,
    from: `${config.fromName} <${config.fromEmail}>`,
    subject: `Daily Sparks ${brief.programme} brief for ${profile.student.studentName}`,
    text: [
      `Hi ${profile.parent.fullName},`,
      "",
      `Today's Daily Sparks brief is ready: ${brief.headline}`,
      "",
      brief.summary,
      "",
      `Themes: ${brief.topicTags.join(", ") || "Daily reading"}`,
      "",
      "Daily Sparks",
    ].join("\n"),
    attachments: [
      {
        filename: attachmentFileName,
        content: Buffer.from(pdf),
        contentType: "application/pdf",
      },
    ],
  });

  return {
    messageId: result.messageId,
    attachmentFileName,
    renderAudit,
  };
}
