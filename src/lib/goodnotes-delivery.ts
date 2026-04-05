import nodemailer from "nodemailer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type { GeneratedDailyBriefDraft } from "./daily-brief-orchestrator";
import type { ParentProfile } from "./mvp-types";
import { renderOutboundDailyBriefTypstPrototype } from "./outbound-daily-brief-typst";
import {
  buildOutboundDailyBriefPacket,
  type OutboundDailyBriefPacketInput,
} from "./outbound-daily-brief-packet";
import { getProgrammeStageSummary, getWeeklyPlan } from "./weekly-plan";

type GoodnotesDeliveryConfig = {
  smtpUrl: string;
  fromEmail: string;
  fromName: string;
};

export type GoodnotesDeliveryResult = {
  messageId: string;
  attachmentFileName: string;
};

export const DAILY_BRIEF_PDF_RENDERERS = ["pdf-lib", "typst"] as const;
export type DailyBriefPdfRenderer =
  (typeof DAILY_BRIEF_PDF_RENDERERS)[number];
export type GoodnotesAttachmentMode = "production" | "canary" | "test";

type GoodnotesWelcomeNote = {
  eyebrow: string;
  title: string;
  intro: string;
  confirmationTitle: string;
  confirmationBody: string;
  detailLines: string[];
  expectationsTitle: string;
  expectationsBody: string;
  weeklyRhythmTitle: string;
  weeklyRhythmBody: string;
  nextStepsTitle: string;
  nextSteps: string[];
  signature: string;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const PAGE_MARGIN = 48;
const BODY_FONT_SIZE = 11;
const LINE_HEIGHT = 17;
const OUTBOUND_INK = rgb(0.06, 0.09, 0.16);
const OUTBOUND_SECONDARY_TEXT = rgb(0.28, 0.35, 0.45);
const OUTBOUND_MUTED_TEXT = rgb(0.4, 0.47, 0.56);
const OUTBOUND_GOLD = rgb(0.71, 0.33, 0.04);
const OUTBOUND_GOLD_SOFT = rgb(0.98, 0.95, 0.87);
const OUTBOUND_PALE_BLUE = rgb(0.93, 0.96, 1);
const OUTBOUND_BLUE_BORDER = rgb(0.82, 0.89, 0.97);
const OUTBOUND_SOFT_BORDER = rgb(0.88, 0.91, 0.96);
const OUTBOUND_PAPER = rgb(1, 0.99, 0.98);

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
  return `${formatHongKongDate(generatedAt)}_DailySparks_WelcomeNote_${programme.toUpperCase()}_getting-started_test.pdf`;
}

function toBriefAttachmentFileName(
  brief: Pick<GeneratedDailyBriefDraft, "programme" | "scheduledFor" | "headline">,
  attachmentMode: GoodnotesAttachmentMode = "production",
  renderer: DailyBriefPdfRenderer = "pdf-lib",
) {
  const safeDate = brief.scheduledFor.trim() || formatHongKongDate();
  const programme = brief.programme.toUpperCase();
  const topicSlug = toAsciiSlug(brief.headline, "daily-reading");
  const modeSuffix = attachmentMode === "canary" ? "_canary" : "";
  const rendererSuffix = renderer === "typst" ? "_typst-prototype" : "";

  return `${safeDate}_DailySparks_DailyBrief_${programme}_${topicSlug}${modeSuffix}${rendererSuffix}.pdf`;
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
  lineHeight = LINE_HEIGHT,
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
    currentY -= lineHeight;
  }

  return currentY;
}

function measureParagraphHeight(
  text: string,
  width: number,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  fontSize: number,
  lineHeight = LINE_HEIGHT,
) {
  return wrapText(text, width, font, fontSize).length * lineHeight;
}

function drawFilledPanel(
  page: Awaited<ReturnType<PDFDocument["addPage"]>>,
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    fillColor: ReturnType<typeof rgb>;
    borderColor?: ReturnType<typeof rgb>;
    borderWidth?: number;
  },
) {
  page.drawRectangle({
    x,
    y: y - height,
    width,
    height,
    color: options.fillColor,
    borderColor: options.borderColor,
    borderWidth: options.borderWidth ?? 0,
  });
}

export function buildGoodnotesWelcomeNote(
  profile: ParentProfile,
): GoodnotesWelcomeNote {
  const stageSummary = getProgrammeStageSummary(profile.student.programme);
  const weeklyPlan = getWeeklyPlan(
    profile.student.programme,
    profile.student.programmeYear,
  );

  return {
    eyebrow: "Growth Education Limited",
    title: "Welcome to Daily Sparks",
    intro: `Hello ${profile.parent.fullName}, your Goodnotes destination is confirmed and ready for delivery. From your first Daily Sparks packet onward, each reading brief will arrive directly in ${profile.student.studentName}'s Goodnotes flow.`,
    confirmationTitle: "Goodnotes destination confirmed",
    confirmationBody:
      "Daily Sparks is now ready to place each reading brief into your family's Goodnotes rhythm with calm, dependable delivery.",
    detailLines: [
      `Programme: ${profile.student.programme} Year ${profile.student.programmeYear}`,
      `Goodnotes destination: ${profile.student.goodnotesEmail}`,
      `Prepared for: ${profile.student.studentName}`,
    ],
    expectationsTitle: "What to expect",
    expectationsBody: stageSummary.description,
    weeklyRhythmTitle: "Reading rhythm",
    weeklyRhythmBody: weeklyPlan.description,
    nextStepsTitle: "Your next steps",
    nextSteps: [
      "Watch for your first Daily Sparks brief to arrive in this Goodnotes destination.",
      "Use each packet as a calm reading moment, with space for parent-child discussion after the story.",
      "If your setup changes, you can update this destination from the dashboard at any time.",
    ],
    signature: "Growth Education Limited",
  };
}

export function buildGoodnotesBriefPacket(
  _profile: ParentProfile,
  brief: GeneratedDailyBriefDraft,
) {
  return buildOutboundDailyBriefPacket(brief);
}

export async function createGoodnotesTestBriefPdf(profile: ParentProfile) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const titleFont = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const labelFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  const welcomeNote = buildGoodnotesWelcomeNote(profile);
  const generatedAt = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date());

  let cursorY = PAGE_HEIGHT - PAGE_MARGIN;

  drawFilledPanel(page, 0, PAGE_HEIGHT, PAGE_WIDTH, PAGE_HEIGHT, {
    fillColor: OUTBOUND_PAPER,
  });

  drawFilledPanel(page, PAGE_MARGIN, cursorY + 6, PAGE_WIDTH - PAGE_MARGIN * 2, 206, {
    fillColor: OUTBOUND_PALE_BLUE,
    borderColor: OUTBOUND_BLUE_BORDER,
    borderWidth: 1,
  });

  page.drawText(welcomeNote.eyebrow.toUpperCase(), {
    x: PAGE_MARGIN + 16,
    y: cursorY - 8,
    size: 10,
    font: labelFont,
    color: OUTBOUND_GOLD,
  });
  cursorY -= 42;

  page.drawText(welcomeNote.title, {
    x: PAGE_MARGIN + 16,
    y: cursorY,
    size: 29,
    font: titleFont,
    color: OUTBOUND_INK,
  });
  cursorY -= 34;

  cursorY = drawParagraph(
    page,
    welcomeNote.intro,
    PAGE_MARGIN + 16,
    cursorY,
    PAGE_WIDTH - PAGE_MARGIN * 2 - 32,
    bodyFont,
    12,
    OUTBOUND_SECONDARY_TEXT,
  );
  cursorY -= 18;

  page.drawText(`Prepared for ${profile.student.studentName}`, {
    x: PAGE_MARGIN + 16,
    y: cursorY,
    size: 11,
    font: labelFont,
    color: OUTBOUND_MUTED_TEXT,
  });

  cursorY = PAGE_HEIGHT - PAGE_MARGIN - 230;

  drawFilledPanel(page, PAGE_MARGIN, cursorY, PAGE_WIDTH - PAGE_MARGIN * 2, 132, {
    fillColor: rgb(1, 1, 1),
    borderColor: OUTBOUND_SOFT_BORDER,
    borderWidth: 1,
  });

  page.drawText(welcomeNote.confirmationTitle, {
    x: PAGE_MARGIN + 18,
    y: cursorY - 28,
    size: 17,
    font: titleFont,
    color: OUTBOUND_INK,
  });
  page.drawText("READY", {
    x: PAGE_WIDTH - PAGE_MARGIN - 72,
    y: cursorY - 24,
    size: 9,
    font: labelFont,
    color: OUTBOUND_GOLD,
  });
  cursorY -= 56;

  cursorY = drawParagraph(
    page,
    welcomeNote.confirmationBody,
    PAGE_MARGIN + 18,
    cursorY,
    PAGE_WIDTH - PAGE_MARGIN * 2 - 36,
    bodyFont,
    BODY_FONT_SIZE,
    OUTBOUND_SECONDARY_TEXT,
  );
  cursorY -= 8;

  for (const line of welcomeNote.detailLines) {
    page.drawText(line, {
      x: PAGE_MARGIN + 18,
      y: cursorY,
      size: BODY_FONT_SIZE,
      font: bodyFont,
      color: OUTBOUND_SECONDARY_TEXT,
    });
    cursorY -= LINE_HEIGHT;
  }

  cursorY -= 10;
  page.drawText(welcomeNote.expectationsTitle, {
    x: PAGE_MARGIN,
    y: cursorY,
    size: 16,
    font: titleFont,
    color: OUTBOUND_INK,
  });
  cursorY -= 24;

  cursorY = drawParagraph(
    page,
    welcomeNote.expectationsBody,
    PAGE_MARGIN,
    cursorY,
    PAGE_WIDTH - PAGE_MARGIN * 2,
    bodyFont,
    BODY_FONT_SIZE,
    OUTBOUND_SECONDARY_TEXT,
  );
  cursorY -= 10;

  drawFilledPanel(page, PAGE_MARGIN, cursorY + 6, PAGE_WIDTH - PAGE_MARGIN * 2, 102, {
    fillColor: OUTBOUND_GOLD_SOFT,
    borderColor: rgb(0.95, 0.84, 0.57),
    borderWidth: 1,
  });

  page.drawText(welcomeNote.weeklyRhythmTitle, {
    x: PAGE_MARGIN + 16,
    y: cursorY - 22,
    size: 16,
    font: titleFont,
    color: OUTBOUND_INK,
  });
  cursorY = drawParagraph(
    page,
    welcomeNote.weeklyRhythmBody,
    PAGE_MARGIN + 16,
    cursorY - 46,
    PAGE_WIDTH - PAGE_MARGIN * 2 - 32,
    bodyFont,
    BODY_FONT_SIZE,
    OUTBOUND_SECONDARY_TEXT,
  );
  cursorY -= 18;

  page.drawText(welcomeNote.nextStepsTitle, {
    x: PAGE_MARGIN,
    y: cursorY,
    size: 16,
    font: titleFont,
    color: OUTBOUND_INK,
  });
  cursorY -= 24;

  for (const step of welcomeNote.nextSteps) {
    cursorY = drawParagraph(
      page,
      `- ${step}`,
      PAGE_MARGIN,
      cursorY,
      PAGE_WIDTH - PAGE_MARGIN * 2,
      bodyFont,
      BODY_FONT_SIZE,
      OUTBOUND_SECONDARY_TEXT,
    );
    cursorY -= 6;
  }

  cursorY -= 18;
  page.drawLine({
    start: { x: PAGE_MARGIN, y: cursorY },
    end: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY },
    thickness: 1,
    color: OUTBOUND_SOFT_BORDER,
  });
  cursorY -= 22;

  cursorY = drawParagraph(
    page,
    "With care,",
    PAGE_MARGIN,
    cursorY,
    PAGE_WIDTH - PAGE_MARGIN * 2,
    bodyFont,
    BODY_FONT_SIZE,
    OUTBOUND_SECONDARY_TEXT,
  );
  cursorY -= 6;

  page.drawText(welcomeNote.signature, {
    x: PAGE_MARGIN,
    y: cursorY,
    size: 12,
    font: titleFont,
    color: OUTBOUND_INK,
  });
  page.drawText(`Prepared ${generatedAt} UTC`, {
    x: PAGE_MARGIN,
    y: cursorY - 22,
    size: 9,
    font: bodyFont,
    color: OUTBOUND_MUTED_TEXT,
  });

  return pdf.save();
}

export async function createOutboundDailyBriefPdf(
  brief: OutboundDailyBriefPacketInput,
  options: {
    renderer?: DailyBriefPdfRenderer;
  } = {},
) {
  if (options.renderer === "typst") {
    const prototype = await renderOutboundDailyBriefTypstPrototype(brief);

    return prototype.pdf;
  }

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const titleFont = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const labelFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  const packet = buildOutboundDailyBriefPacket(brief);
  const generatedAt = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date());

  let cursorY = PAGE_HEIGHT - PAGE_MARGIN;
  const heroWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
  const heroInnerWidth = heroWidth - 32;
  const titleLines = wrapText(packet.title, heroInnerWidth, titleFont, 27);
  const heroHeight = 86 + titleLines.length * 30;

  drawFilledPanel(page, 0, PAGE_HEIGHT, PAGE_WIDTH, PAGE_HEIGHT, {
    fillColor: OUTBOUND_PAPER,
  });

  drawFilledPanel(page, PAGE_MARGIN, cursorY + 6, heroWidth, heroHeight, {
    fillColor: OUTBOUND_PALE_BLUE,
    borderColor: OUTBOUND_BLUE_BORDER,
    borderWidth: 1,
  });

  page.drawText(packet.eyebrow.toUpperCase(), {
    x: PAGE_MARGIN + 16,
    y: cursorY - 8,
    size: 10,
    font: labelFont,
    color: OUTBOUND_GOLD,
  });
  cursorY -= 38;

  for (const line of titleLines) {
    page.drawText(line, {
      x: PAGE_MARGIN + 16,
      y: cursorY,
      size: 27,
      font: titleFont,
      color: OUTBOUND_INK,
    });
    cursorY -= 30;
  }

  cursorY -= 4;

  let metadataX = PAGE_MARGIN + 16;
  for (const item of packet.metadataItems) {
    const itemWidth = bodyFont.widthOfTextAtSize(item, 10) + 22;
    drawFilledPanel(page, metadataX, cursorY + 8, itemWidth, 24, {
      fillColor: rgb(1, 1, 1),
      borderColor: OUTBOUND_SOFT_BORDER,
      borderWidth: 1,
    });
    page.drawText(item, {
      x: metadataX + 11,
      y: cursorY - 7,
      size: 10,
      font: labelFont,
      color: OUTBOUND_SECONDARY_TEXT,
    });
    metadataX += itemWidth + 10;
  }

  cursorY = PAGE_HEIGHT - PAGE_MARGIN - heroHeight - 28;

  const summaryHeight =
    52 +
    measureParagraphHeight(
      packet.summaryBody,
      PAGE_WIDTH - PAGE_MARGIN * 2 - 36,
      bodyFont,
      BODY_FONT_SIZE,
    ) +
    14;

  drawFilledPanel(page, PAGE_MARGIN, cursorY, PAGE_WIDTH - PAGE_MARGIN * 2, summaryHeight, {
    fillColor: rgb(1, 1, 1),
    borderColor: OUTBOUND_SOFT_BORDER,
    borderWidth: 1,
  });

  page.drawText(packet.summaryTitle, {
    x: PAGE_MARGIN + 18,
    y: cursorY - 24,
    size: 16,
    font: titleFont,
    color: OUTBOUND_INK,
  });
  cursorY = drawParagraph(
    page,
    packet.summaryBody,
    PAGE_MARGIN + 18,
    cursorY - 50,
    PAGE_WIDTH - PAGE_MARGIN * 2 - 36,
    bodyFont,
    BODY_FONT_SIZE,
      OUTBOUND_SECONDARY_TEXT,
    );
  cursorY -= 22;

  if (packet.themesTitle && packet.themesBody) {
    const themeHeight =
      40 +
      measureParagraphHeight(
        packet.themesBody,
        PAGE_WIDTH - PAGE_MARGIN * 2 - 32,
        bodyFont,
        BODY_FONT_SIZE,
      ) +
      10;
    drawFilledPanel(page, PAGE_MARGIN, cursorY + 8, PAGE_WIDTH - PAGE_MARGIN * 2, themeHeight, {
      fillColor: OUTBOUND_GOLD_SOFT,
      borderColor: rgb(0.95, 0.84, 0.57),
      borderWidth: 1,
    });
    page.drawText(packet.themesTitle, {
      x: PAGE_MARGIN + 16,
      y: cursorY - 12,
      size: 14,
      font: titleFont,
      color: OUTBOUND_INK,
    });
    cursorY = drawParagraph(
      page,
      packet.themesBody,
      PAGE_MARGIN + 16,
      cursorY - 34,
      PAGE_WIDTH - PAGE_MARGIN * 2 - 32,
      bodyFont,
      BODY_FONT_SIZE,
      OUTBOUND_SECONDARY_TEXT,
    );
    cursorY -= 18;
  }

  page.drawText(packet.readingTitle, {
    x: PAGE_MARGIN,
    y: cursorY,
    size: 16,
    font: titleFont,
    color: OUTBOUND_INK,
  });
  cursorY -= 24;

  for (const section of packet.readingSections) {
    if (section.title) {
      page.drawText(section.title, {
        x: PAGE_MARGIN,
        y: cursorY,
        size: 12,
        font: labelFont,
        color: OUTBOUND_INK,
      });
      cursorY -= 18;
    }

    cursorY = drawParagraph(
      page,
      section.body,
      PAGE_MARGIN,
      cursorY,
      PAGE_WIDTH - PAGE_MARGIN * 2,
      bodyFont,
      BODY_FONT_SIZE,
      OUTBOUND_SECONDARY_TEXT,
    );
    cursorY -= 10;
  }

  if (packet.vocabularyTitle && packet.vocabularyItems.length > 0) {
    const vocabularyHeight =
      32 +
      packet.vocabularyItems.reduce(
        (total, item) =>
          total +
          14 +
          measureParagraphHeight(
            item.definition,
            PAGE_WIDTH - PAGE_MARGIN * 2 - 32,
            bodyFont,
            BODY_FONT_SIZE,
          ) +
          8,
        0,
      );
    drawFilledPanel(page, PAGE_MARGIN, cursorY + 8, PAGE_WIDTH - PAGE_MARGIN * 2, vocabularyHeight, {
      fillColor: OUTBOUND_GOLD_SOFT,
      borderColor: rgb(0.95, 0.84, 0.57),
      borderWidth: 1,
    });
    page.drawText(packet.vocabularyTitle, {
      x: PAGE_MARGIN + 16,
      y: cursorY - 12,
      size: 14,
      font: titleFont,
      color: OUTBOUND_INK,
    });
    let vocabularyY = cursorY - 34;
    for (const item of packet.vocabularyItems) {
      page.drawText(item.term, {
        x: PAGE_MARGIN + 16,
        y: vocabularyY,
        size: 11,
        font: labelFont,
        color: OUTBOUND_INK,
      });
      vocabularyY = drawParagraph(
        page,
        item.definition,
        PAGE_MARGIN + 16,
        vocabularyY - 16,
        PAGE_WIDTH - PAGE_MARGIN * 2 - 32,
        bodyFont,
        BODY_FONT_SIZE,
        OUTBOUND_SECONDARY_TEXT,
      );
      vocabularyY -= 8;
    }
    cursorY = vocabularyY - 10;
  }

  if (packet.bigIdeaTitle && packet.bigIdeaBody) {
    const bigIdeaHeight =
      40 +
      measureParagraphHeight(
        packet.bigIdeaBody,
        PAGE_WIDTH - PAGE_MARGIN * 2 - 32,
        bodyFont,
        BODY_FONT_SIZE,
      ) +
      10;
    drawFilledPanel(page, PAGE_MARGIN, cursorY + 8, PAGE_WIDTH - PAGE_MARGIN * 2, bigIdeaHeight, {
      fillColor: rgb(1, 1, 1),
      borderColor: OUTBOUND_SOFT_BORDER,
      borderWidth: 1,
    });
    page.drawText(packet.bigIdeaTitle, {
      x: PAGE_MARGIN + 16,
      y: cursorY - 14,
      size: 15,
      font: titleFont,
      color: OUTBOUND_INK,
    });
    cursorY = drawParagraph(
      page,
      packet.bigIdeaBody,
      PAGE_MARGIN + 16,
      cursorY - 38,
      PAGE_WIDTH - PAGE_MARGIN * 2 - 32,
      bodyFont,
      BODY_FONT_SIZE,
      OUTBOUND_SECONDARY_TEXT,
    );
    cursorY -= 18;
  }

  const discussionHeight =
    32 +
    packet.discussionPrompts.reduce(
      (total, prompt) =>
        total +
        measureParagraphHeight(
          `- ${prompt}`,
          PAGE_WIDTH - PAGE_MARGIN * 2 - 32,
          bodyFont,
          BODY_FONT_SIZE,
        ) +
        4,
      0,
    ) +
    8;
  drawFilledPanel(page, PAGE_MARGIN, cursorY + 8, PAGE_WIDTH - PAGE_MARGIN * 2, discussionHeight, {
    fillColor: OUTBOUND_PALE_BLUE,
    borderColor: OUTBOUND_BLUE_BORDER,
    borderWidth: 1,
  });
  page.drawText(packet.discussionTitle, {
    x: PAGE_MARGIN + 16,
    y: cursorY - 14,
    size: 15,
    font: titleFont,
    color: OUTBOUND_INK,
  });
  let promptY = cursorY - 38;
  for (const prompt of packet.discussionPrompts) {
    promptY = drawParagraph(
      page,
      `- ${prompt}`,
      PAGE_MARGIN + 16,
      promptY,
      PAGE_WIDTH - PAGE_MARGIN * 2 - 32,
      bodyFont,
      BODY_FONT_SIZE,
      OUTBOUND_SECONDARY_TEXT,
    );
    promptY -= 4;
  }
  cursorY = promptY - 14;

  if (packet.sourceLines.length > 0) {
    page.drawText(packet.sourcesTitle, {
      x: PAGE_MARGIN,
      y: cursorY,
      size: 15,
      font: titleFont,
      color: OUTBOUND_INK,
    });
    cursorY -= 24;

    for (const sourceLine of packet.sourceLines) {
      cursorY = drawParagraph(
        page,
        sourceLine,
        PAGE_MARGIN,
        cursorY,
        PAGE_WIDTH - PAGE_MARGIN * 2,
        bodyFont,
        BODY_FONT_SIZE,
        OUTBOUND_SECONDARY_TEXT,
      );
      cursorY -= 6;
    }
  }

  cursorY -= 12;
  page.drawLine({
    start: { x: PAGE_MARGIN, y: cursorY },
    end: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY },
    thickness: 1,
    color: OUTBOUND_SOFT_BORDER,
  });
  cursorY -= 20;
  page.drawText(packet.footerSignature, {
    x: PAGE_MARGIN,
    y: cursorY,
    size: 12,
    font: titleFont,
    color: OUTBOUND_INK,
  });
  page.drawText(`Prepared ${generatedAt} UTC`, {
    x: PAGE_MARGIN,
    y: cursorY - 18,
    size: 9,
    font: bodyFont,
    color: OUTBOUND_MUTED_TEXT,
  });

  return pdf.save();
}

export async function createGoodnotesBriefPdf(
  _profile: ParentProfile,
  brief: GeneratedDailyBriefDraft,
  options: {
    renderer?: DailyBriefPdfRenderer;
  } = {},
) {
  return createOutboundDailyBriefPdf(brief, options);
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
    renderer?: DailyBriefPdfRenderer;
  } = {},
): Promise<GoodnotesDeliveryResult> {
  const config = getGoodnotesDeliveryConfig();

  if (!config) {
    throw new Error("Goodnotes delivery is not configured yet.");
  }

  const attachmentFileName = toBriefAttachmentFileName(
    brief,
    options.attachmentMode ?? "production",
    options.renderer ?? "pdf-lib",
  );
  const pdfBytes = await createGoodnotesBriefPdf(profile, brief, {
    renderer: options.renderer ?? "pdf-lib",
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
