import nodemailer from "nodemailer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type { GeneratedDailyBriefDraft } from "./daily-brief-orchestrator";
import { getProgrammeStageSummary, getWeeklyPlan } from "./weekly-plan";
import type { ParentProfile } from "./mvp-types";

type GoodnotesDeliveryConfig = {
  smtpUrl: string;
  fromEmail: string;
  fromName: string;
};

export type GoodnotesDeliveryResult = {
  messageId: string;
  attachmentFileName: string;
};

export type GoodnotesAttachmentMode = "production" | "canary" | "test";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const PAGE_MARGIN = 48;
const BODY_FONT_SIZE = 11;
const LINE_HEIGHT = 17;

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

function formatHongKongDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${year}-${month}-${day}`;
}

function toTestAttachmentFileName(programme: string, generatedAt = new Date()) {
  return `${formatHongKongDate(generatedAt)}_DailySparks_TestBrief_${programme.toUpperCase()}_delivery-check_test.pdf`;
}

function toBriefAttachmentFileName(
  brief: Pick<GeneratedDailyBriefDraft, "programme" | "scheduledFor" | "headline">,
  attachmentMode: GoodnotesAttachmentMode = "production",
) {
  const safeDate = brief.scheduledFor.trim() || formatHongKongDate();
  const programme = brief.programme.toUpperCase();
  const topicSlug = toAsciiSlug(brief.headline, "daily-reading");
  const modeSuffix = attachmentMode === "canary" ? "_canary" : "";

  return `${safeDate}_DailySparks_DailyBrief_${programme}_${topicSlug}${modeSuffix}.pdf`;
}

function wrapText(
  text: string,
  maxWidth: number,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  fontSize: number,
) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    const nextWidth = font.widthOfTextAtSize(nextLine, fontSize);

    if (nextWidth <= maxWidth || !currentLine) {
      currentLine = nextLine;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function drawParagraph(
  page: Awaited<ReturnType<PDFDocument["addPage"]>>,
  text: string,
  x: number,
  y: number,
  width: number,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  fontSize: number,
  color = rgb(0.2, 0.27, 0.38),
) {
  const lines = wrapText(text, width, font, fontSize);
  let currentY = y;

  for (const line of lines) {
    page.drawText(line, {
      x,
      y: currentY,
      size: fontSize,
      font,
      color,
    });
    currentY -= LINE_HEIGHT;
  }

  return currentY;
}

export async function createGoodnotesTestBriefPdf(profile: ParentProfile) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  const stageSummary = getProgrammeStageSummary(profile.student.programme);
  const weeklyPlan = getWeeklyPlan(
    profile.student.programme,
    profile.student.programmeYear,
  );
  const generatedAt = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date());

  let cursorY = PAGE_HEIGHT - PAGE_MARGIN;

  page.drawText("Daily Sparks", {
    x: PAGE_MARGIN,
    y: cursorY,
    size: 14,
    font: titleFont,
    color: rgb(0.97, 0.73, 0.12),
  });
  cursorY -= 34;

  page.drawText("Goodnotes test brief", {
    x: PAGE_MARGIN,
    y: cursorY,
    size: 24,
    font: titleFont,
    color: rgb(0.06, 0.09, 0.16),
  });
  cursorY -= 28;

  cursorY = drawParagraph(
    page,
    `Prepared for ${profile.student.studentName} (${profile.student.programme}) to verify that Daily Sparks can deliver PDF reading briefs into Goodnotes.`,
    PAGE_MARGIN,
    cursorY,
    PAGE_WIDTH - PAGE_MARGIN * 2,
    bodyFont,
    BODY_FONT_SIZE,
  );
  cursorY -= 8;

  const metadataLines = [
    `Parent workspace: ${profile.parent.fullName}`,
    `Parent email: ${profile.parent.email}`,
    `Goodnotes destination: ${profile.student.goodnotesEmail}`,
    `Generated: ${generatedAt} UTC`,
  ];

  for (const line of metadataLines) {
    page.drawText(line, {
      x: PAGE_MARGIN,
      y: cursorY,
      size: BODY_FONT_SIZE,
      font: bodyFont,
      color: rgb(0.2, 0.27, 0.38),
    });
    cursorY -= LINE_HEIGHT;
  }

  cursorY -= 10;
  page.drawText(stageSummary.title, {
    x: PAGE_MARGIN,
    y: cursorY,
    size: 15,
    font: titleFont,
    color: rgb(0.06, 0.09, 0.16),
  });
  cursorY -= 24;

  cursorY = drawParagraph(
    page,
    stageSummary.description,
    PAGE_MARGIN,
    cursorY,
    PAGE_WIDTH - PAGE_MARGIN * 2,
    bodyFont,
    BODY_FONT_SIZE,
  );
  cursorY -= 8;

  page.drawText(weeklyPlan.title, {
    x: PAGE_MARGIN,
    y: cursorY,
    size: 15,
    font: titleFont,
    color: rgb(0.06, 0.09, 0.16),
  });
  cursorY -= 24;

  cursorY = drawParagraph(
    page,
    weeklyPlan.description,
    PAGE_MARGIN,
    cursorY,
    PAGE_WIDTH - PAGE_MARGIN * 2,
    bodyFont,
    BODY_FONT_SIZE,
  );
  cursorY -= 8;

  for (const entry of weeklyPlan.weekdays.slice(0, 3)) {
    cursorY = drawParagraph(
      page,
      `${entry.day}: ${entry.label} — ${entry.theme}. ${entry.note}`,
      PAGE_MARGIN,
      cursorY,
      PAGE_WIDTH - PAGE_MARGIN * 2,
      bodyFont,
      BODY_FONT_SIZE,
    );
    cursorY -= 6;
  }

  cursorY = drawParagraph(
    page,
    `${weeklyPlan.sunday.label}: ${weeklyPlan.sunday.theme}. ${weeklyPlan.sunday.note}`,
    PAGE_MARGIN,
    cursorY,
    PAGE_WIDTH - PAGE_MARGIN * 2,
    bodyFont,
    BODY_FONT_SIZE,
  );
  cursorY -= 10;

  cursorY = drawParagraph(
    page,
    "If this PDF arrives in Goodnotes, the delivery destination is ready for Daily Sparks reading briefs.",
    PAGE_MARGIN,
    cursorY,
    PAGE_WIDTH - PAGE_MARGIN * 2,
    bodyFont,
    BODY_FONT_SIZE,
  );

  return pdf.save();
}

function extractParagraphsFromMarkdown(markdown: string) {
  return markdown
    .split(/\n{2,}/)
    .map((segment) => segment.replace(/^#+\s*/gm, "").trim())
    .filter(Boolean);
}

export async function createGoodnotesBriefPdf(
  profile: ParentProfile,
  brief: GeneratedDailyBriefDraft,
) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  const generatedAt = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date());

  let cursorY = PAGE_HEIGHT - PAGE_MARGIN;

  page.drawText("Daily Sparks", {
    x: PAGE_MARGIN,
    y: cursorY,
    size: 14,
    font: titleFont,
    color: rgb(0.97, 0.73, 0.12),
  });
  cursorY -= 34;

  page.drawText(brief.headline, {
    x: PAGE_MARGIN,
    y: cursorY,
    size: 22,
    font: titleFont,
    color: rgb(0.06, 0.09, 0.16),
    maxWidth: PAGE_WIDTH - PAGE_MARGIN * 2,
  });
  cursorY -= 28;

  const metadataLines = [
    `Student: ${profile.student.studentName} (${brief.programme})`,
    `Goodnotes destination: ${profile.student.goodnotesEmail}`,
    `Scheduled for: ${brief.scheduledFor}`,
    `Generated: ${generatedAt} UTC`,
  ];

  for (const line of metadataLines) {
    page.drawText(line, {
      x: PAGE_MARGIN,
      y: cursorY,
      size: BODY_FONT_SIZE,
      font: bodyFont,
      color: rgb(0.2, 0.27, 0.38),
    });
    cursorY -= LINE_HEIGHT;
  }

  cursorY -= 8;
  page.drawText("Summary", {
    x: PAGE_MARGIN,
    y: cursorY,
    size: 15,
    font: titleFont,
    color: rgb(0.06, 0.09, 0.16),
  });
  cursorY -= 24;

  cursorY = drawParagraph(
    page,
    brief.summary,
    PAGE_MARGIN,
    cursorY,
    PAGE_WIDTH - PAGE_MARGIN * 2,
    bodyFont,
    BODY_FONT_SIZE,
  );
  cursorY -= 8;

  if (brief.topicTags.length > 0) {
    page.drawText("Themes", {
      x: PAGE_MARGIN,
      y: cursorY,
      size: 15,
      font: titleFont,
      color: rgb(0.06, 0.09, 0.16),
    });
    cursorY -= 24;

    cursorY = drawParagraph(
      page,
      brief.topicTags.join(", "),
      PAGE_MARGIN,
      cursorY,
      PAGE_WIDTH - PAGE_MARGIN * 2,
      bodyFont,
      BODY_FONT_SIZE,
    );
    cursorY -= 8;
  }

  page.drawText("Brief", {
    x: PAGE_MARGIN,
    y: cursorY,
    size: 15,
    font: titleFont,
    color: rgb(0.06, 0.09, 0.16),
  });
  cursorY -= 24;

  for (const paragraph of extractParagraphsFromMarkdown(brief.briefMarkdown)) {
    cursorY = drawParagraph(
      page,
      paragraph,
      PAGE_MARGIN,
      cursorY,
      PAGE_WIDTH - PAGE_MARGIN * 2,
      bodyFont,
      BODY_FONT_SIZE,
    );
    cursorY -= 8;
  }

  if (brief.sourceReferences.length > 0) {
    page.drawText("Sources", {
      x: PAGE_MARGIN,
      y: cursorY,
      size: 15,
      font: titleFont,
      color: rgb(0.06, 0.09, 0.16),
    });
    cursorY -= 24;

    for (const reference of brief.sourceReferences) {
      cursorY = drawParagraph(
        page,
        `${reference.sourceName}: ${reference.articleTitle}`,
        PAGE_MARGIN,
        cursorY,
        PAGE_WIDTH - PAGE_MARGIN * 2,
        bodyFont,
        BODY_FONT_SIZE,
      );
      cursorY -= 6;
    }
  }

  return pdf.save();
}

export async function sendTestBriefToGoodnotes(
  profile: ParentProfile,
): Promise<GoodnotesDeliveryResult> {
  const config = getGoodnotesDeliveryConfig();

  if (!config) {
    throw new Error("Goodnotes delivery is not configured yet.");
  }

  const attachmentFileName = toTestAttachmentFileName(profile.student.programme);
  const pdfBytes = await createGoodnotesTestBriefPdf(profile);
  const transporter = nodemailer.createTransport(config.smtpUrl);
  const result = await transporter.sendMail({
    to: profile.student.goodnotesEmail,
    from: `${config.fromName} <${config.fromEmail}>`,
    subject: `Daily Sparks test brief for ${profile.student.studentName}`,
    text: [
      `Hi ${profile.parent.fullName},`,
      "",
      "Attached is a Daily Sparks test brief PDF for Goodnotes delivery verification.",
      "If it appears in Goodnotes, your destination is ready for regular reading briefs.",
      "",
      "Daily Sparks",
    ].join("\n"),
    attachments: [
      {
        filename: attachmentFileName,
        content: Buffer.from(pdfBytes),
        contentType: "application/pdf",
      },
    ],
  });

  return {
    messageId: result.messageId,
    attachmentFileName,
  };
}

export async function sendBriefToGoodnotes(
  profile: ParentProfile,
  brief: GeneratedDailyBriefDraft,
  options: {
    attachmentMode?: Extract<GoodnotesAttachmentMode, "production" | "canary">;
  } = {},
): Promise<GoodnotesDeliveryResult> {
  const config = getGoodnotesDeliveryConfig();

  if (!config) {
    throw new Error("Goodnotes delivery is not configured yet.");
  }

  const attachmentFileName = toBriefAttachmentFileName(
    brief,
    options.attachmentMode ?? "production",
  );
  const pdfBytes = await createGoodnotesBriefPdf(profile, brief);
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
        content: Buffer.from(pdfBytes),
        contentType: "application/pdf",
      },
    ],
  });

  return {
    messageId: result.messageId,
    attachmentFileName,
  };
}
