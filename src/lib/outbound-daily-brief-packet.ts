import type { DailyBriefEditorialCohort } from "./daily-brief-cohorts";
import type { DailyBriefSourceReference } from "./daily-brief-history-schema";

export type OutboundDailyBriefReadingSection = {
  title: string | null;
  body: string;
};

export type OutboundDailyBriefVocabularyItem = {
  term: string;
  definition: string;
};

export type OutboundDailyBriefPacket = {
  eyebrow: string;
  title: string;
  metadataItems: string[];
  summaryTitle: string;
  summaryBody: string;
  themesTitle: string | null;
  themesBody: string | null;
  readingTitle: string;
  readingSections: OutboundDailyBriefReadingSection[];
  readingParagraphs: string[];
  vocabularyTitle: string | null;
  vocabularyItems: OutboundDailyBriefVocabularyItem[];
  discussionTitle: string;
  discussionPrompts: string[];
  bigIdeaTitle: string | null;
  bigIdeaBody: string | null;
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

type StructuredSectionKey =
  | "whatsHappening"
  | "whyDoesThisMatter"
  | "pictureIt"
  | "wordsToKnow"
  | "talkAboutItAtHome"
  | "bigIdea";

const STRUCTURED_SECTION_DEFINITIONS: {
  key: StructuredSectionKey;
  title: string;
  pattern: RegExp;
}[] = [
  {
    key: "whatsHappening",
    title: "What's happening?",
    pattern: /what['’]s happening\?/i,
  },
  {
    key: "whyDoesThisMatter",
    title: "Why does this matter?",
    pattern: /why does this matter\?/i,
  },
  {
    key: "pictureIt",
    title: "Picture it",
    pattern: /picture it(?:\?|:)?/i,
  },
  {
    key: "wordsToKnow",
    title: "Words to know",
    pattern: /words to know/i,
  },
  {
    key: "talkAboutItAtHome",
    title: "Talk about it at home",
    pattern: /talk about it at home/i,
  },
  {
    key: "bigIdea",
    title: "Big idea",
    pattern: /big idea/i,
  },
];

function stripMarkdownDecorators(value: string) {
  return value
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^[*-]\s+/gm, "")
    .replace(/^#+\s*/gm, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeWhitespace(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+([?.!,;:])/g, "$1")
    .trim();
}

function sanitizePlainText(value: string) {
  return normalizeWhitespace(stripMarkdownDecorators(value));
}

function buildCollapsedMarkdownText(markdown: string) {
  return sanitizePlainText(markdown).replace(/\n+/g, " ");
}

function extractStructuredSections(markdown: string) {
  const collapsedText = buildCollapsedMarkdownText(markdown);
  const matches = STRUCTURED_SECTION_DEFINITIONS
    .map((sectionDefinition) => {
      const match = sectionDefinition.pattern.exec(collapsedText);

      if (!match) {
        return null;
      }

      return {
        ...sectionDefinition,
        start: match.index,
        labelEnd: match.index + match[0].length,
      };
    })
    .filter((match): match is NonNullable<typeof match> => match !== null)
    .sort((left, right) => left.start - right.start);

  const sections = new Map<
    StructuredSectionKey,
    {
      title: string;
      body: string;
    }
  >();

  for (const [index, match] of matches.entries()) {
    const nextMatch = matches[index + 1];
    const rawBody = collapsedText.slice(
      match.labelEnd,
      nextMatch?.start ?? collapsedText.length,
    );
    const body = normalizeWhitespace(rawBody.replace(/^[:\-\s]+/, ""));

    if (!body) {
      continue;
    }

    sections.set(match.key, {
      title: match.title,
      body,
    });
  }

  return sections;
}

function flattenReadingSections(
  readingSections: OutboundDailyBriefReadingSection[],
) {
  return readingSections.map((section) =>
    section.title ? `${section.title} ${section.body}` : section.body,
  );
}

function splitDelimitedItems(value: string) {
  return value
    .split(/\s+-\s+/)
    .map((segment) => sanitizePlainText(segment))
    .filter(Boolean);
}

function parseVocabularyItems(value: string): OutboundDailyBriefVocabularyItem[] {
  return splitDelimitedItems(value)
    .map((segment) => {
      const separatorIndex = segment.indexOf(":");

      if (separatorIndex < 0) {
        return null;
      }

      const term = sanitizePlainText(segment.slice(0, separatorIndex));
      const definition = sanitizePlainText(segment.slice(separatorIndex + 1));

      if (!term || !definition) {
        return null;
      }

      return {
        term,
        definition,
      };
    })
    .filter((item): item is OutboundDailyBriefVocabularyItem => item !== null);
}

function parseDiscussionPrompts(value: string) {
  return splitDelimitedItems(value);
}

export function extractOutboundParagraphsFromMarkdown(markdown: string) {
  return markdown
    .split(/\n{2,}/)
    .map((segment) => sanitizePlainText(segment))
    .filter(Boolean);
}

export function buildOutboundDailyBriefPacket(
  brief: OutboundDailyBriefPacketInput,
): OutboundDailyBriefPacket {
  const structuredSections = extractStructuredSections(brief.briefMarkdown);
  const readingSections = (
    [
      structuredSections.get("whatsHappening"),
      structuredSections.get("whyDoesThisMatter"),
      structuredSections.get("pictureIt"),
    ].filter(Boolean) as { title: string; body: string }[]
  ).map((section) => ({
    title: section.title,
    body: section.body,
  }));
  const fallbackReadingSections =
    readingSections.length > 0
      ? readingSections
      : extractOutboundParagraphsFromMarkdown(brief.briefMarkdown).map(
          (paragraph) => ({
            title: null,
            body: paragraph,
          }),
        );
  const wordsToKnow = structuredSections.get("wordsToKnow");
  const talkAtHome = structuredSections.get("talkAboutItAtHome");
  const bigIdea = structuredSections.get("bigIdea");

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
    readingSections: fallbackReadingSections,
    readingParagraphs: flattenReadingSections(fallbackReadingSections),
    vocabularyTitle: wordsToKnow?.title ?? null,
    vocabularyItems: wordsToKnow ? parseVocabularyItems(wordsToKnow.body) : [],
    discussionTitle: talkAtHome?.title ?? "Discussion prompts",
    discussionPrompts: talkAtHome
      ? parseDiscussionPrompts(talkAtHome.body)
      : [
          "What feels most important in today's story?",
          "Which detail would you like to understand more clearly?",
          "How does this connect to your own world or experience?",
        ],
    bigIdeaTitle: bigIdea?.title ?? null,
    bigIdeaBody: bigIdea?.body ?? null,
    sourcesTitle: "Source references",
    sourceLines: brief.sourceReferences.map(
      (reference) => `${reference.sourceName} - ${reference.articleTitle}`,
    ),
    footerSignature: "Growth Education Limited",
  };
}
