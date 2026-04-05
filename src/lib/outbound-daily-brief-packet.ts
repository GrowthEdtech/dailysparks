import type { DailyBriefEditorialCohort } from "./daily-brief-cohorts";
import type { DailyBriefSourceReference } from "./daily-brief-history-schema";

export type OutboundDailyBriefPacket = {
  eyebrow: string;
  title: string;
  metadataItems: string[];
  summaryTitle: string;
  summaryBody: string;
  themesTitle: string | null;
  themesBody: string | null;
  readingTitle: string;
  readingParagraphs: string[];
  discussionTitle: string;
  discussionPrompts: string[];
  sourcesTitle: string;
  sourceLines: string[];
  footerSignature: string;
};

export type OutboundDailyBriefPacketInput = {
  headline: string;
  scheduledFor: string;
  programme: string;
  editorialCohort?: DailyBriefEditorialCohort;
  summary: string;
  topicTags: string[];
  briefMarkdown: string;
  sourceReferences: DailyBriefSourceReference[];
};

export function formatOutboundScheduledDateLabel(scheduledFor: string) {
  const date = new Date(`${scheduledFor}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return scheduledFor;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatOutboundEditorialCohortEdition(
  editorialCohort: DailyBriefEditorialCohort | undefined,
) {
  if (!editorialCohort) {
    return "Global edition";
  }

  return `${editorialCohort} edition`;
}

export function extractOutboundParagraphsFromMarkdown(markdown: string) {
  return markdown
    .split(/\n{2,}/)
    .map((segment) => segment.replace(/^#+\s*/gm, "").trim())
    .filter(Boolean);
}

export function buildOutboundDailyBriefPacket(
  brief: OutboundDailyBriefPacketInput,
): OutboundDailyBriefPacket {
  return {
    eyebrow: "Daily Sparks",
    title: brief.headline,
    metadataItems: [
      formatOutboundScheduledDateLabel(brief.scheduledFor),
      `${brief.programme} edition`,
      formatOutboundEditorialCohortEdition(brief.editorialCohort),
    ],
    summaryTitle: "Summary deck",
    summaryBody: brief.summary,
    themesTitle: brief.topicTags.length > 0 ? "Theme focus" : null,
    themesBody: brief.topicTags.length > 0 ? brief.topicTags.join(", ") : null,
    readingTitle: "Reading brief",
    readingParagraphs: extractOutboundParagraphsFromMarkdown(brief.briefMarkdown),
    discussionTitle: "Discussion prompts",
    discussionPrompts: [
      "What feels most important in today's story?",
      "Which detail would you like to understand more clearly?",
      "How does this connect to your own world or experience?",
    ],
    sourcesTitle: "Source references",
    sourceLines: brief.sourceReferences.map(
      (reference) => `${reference.sourceName} - ${reference.articleTitle}`,
    ),
    footerSignature: "Growth Education Limited",
  };
}
