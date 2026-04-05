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
  layoutVariant: "standard" | "pyp-one-page" | "myp-compare";
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

function splitSentences(value: string) {
  return sanitizePlainText(value)
    .split(/(?<=[.!?])\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function truncateSentenceBudget(
  value: string,
  options: {
    maxSentences: number;
    maxCharacters?: number;
  },
) {
  const { maxSentences, maxCharacters } = options;
  const sentences = splitSentences(value).slice(0, maxSentences);
  const joined = normalizeWhitespace(sentences.join(" "));

  if (!maxCharacters || joined.length <= maxCharacters) {
    return joined;
  }

  return `${joined.slice(0, Math.max(0, maxCharacters - 1)).trimEnd()}…`;
}

function applyPypOnePagePolicyToReadingSections(
  sections: OutboundDailyBriefReadingSection[],
) {
  return sections.map((section) => ({
    ...section,
    body: truncateSentenceBudget(section.body, {
      maxSentences: 2,
      maxCharacters: 220,
    }),
  }));
}

function applyMypComparePolicyToReadingSections(
  sections: OutboundDailyBriefReadingSection[],
) {
  return sections.map((section) => ({
    ...section,
    body: truncateSentenceBudget(section.body, {
      maxSentences: 2,
      maxCharacters: 320,
    }),
  }));
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
  const normalizedProgramme = brief.programme.toUpperCase();
  const layoutVariant =
    normalizedProgramme === "PYP"
      ? "pyp-one-page"
      : normalizedProgramme === "MYP"
        ? "myp-compare"
        : "standard";
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
  const baseReadingSections = fallbackReadingSections;
  const readingSectionsForLayout =
    layoutVariant === "pyp-one-page"
      ? applyPypOnePagePolicyToReadingSections(baseReadingSections)
      : layoutVariant === "myp-compare"
        ? applyMypComparePolicyToReadingSections(baseReadingSections)
      : baseReadingSections;
  const vocabularyItems = wordsToKnow ? parseVocabularyItems(wordsToKnow.body) : [];
  const discussionPrompts = talkAtHome
    ? parseDiscussionPrompts(talkAtHome.body)
    : [
        "What feels most important in today's story?",
        "Which detail would you like to understand more clearly?",
        "How does this connect to your own world or experience?",
      ];
  const topicTagsForLayout =
    layoutVariant === "pyp-one-page"
      ? brief.topicTags.slice(0, 4)
      : layoutVariant === "myp-compare"
        ? brief.topicTags.slice(0, 5)
        : brief.topicTags;
  const summaryBodyForLayout =
    layoutVariant === "pyp-one-page"
      ? truncateSentenceBudget(brief.summary, {
          maxSentences: 2,
          maxCharacters: 180,
        })
      : layoutVariant === "myp-compare"
        ? truncateSentenceBudget(brief.summary, {
            maxSentences: 2,
            maxCharacters: 240,
          })
      : brief.summary;
  const vocabularyItemsForLayout =
    layoutVariant === "pyp-one-page"
      ? vocabularyItems.slice(0, 2).map((item) => ({
          ...item,
          definition: truncateSentenceBudget(item.definition, {
            maxSentences: 1,
            maxCharacters: 92,
          }),
        }))
      : layoutVariant === "myp-compare"
        ? vocabularyItems.slice(0, 3).map((item) => ({
            ...item,
            definition: truncateSentenceBudget(item.definition, {
              maxSentences: 1,
              maxCharacters: 120,
            }),
          }))
      : vocabularyItems;
  const discussionPromptsForLayout =
    layoutVariant === "pyp-one-page"
      ? discussionPrompts.slice(0, 2).map((prompt) =>
          truncateSentenceBudget(prompt, {
            maxSentences: 1,
            maxCharacters: 92,
          }),
        )
      : layoutVariant === "myp-compare"
        ? discussionPrompts.slice(0, 3).map((prompt) =>
            truncateSentenceBudget(prompt, {
              maxSentences: 1,
              maxCharacters: 110,
            }),
          )
      : discussionPrompts;
  const bigIdeaBodyForLayout = bigIdea?.body
    ? layoutVariant === "pyp-one-page"
      ? truncateSentenceBudget(bigIdea.body, {
          maxSentences: 1,
        })
      : layoutVariant === "myp-compare"
        ? truncateSentenceBudget(bigIdea.body, {
            maxSentences: 2,
            maxCharacters: 180,
          })
      : bigIdea.body
    : null;

  return {
    layoutVariant,
    eyebrow: "Daily Sparks",
    title: brief.headline,
    metadataItems: [
      formatOutboundScheduledDateLabel(brief.scheduledFor),
      `${brief.programme} edition`,
      formatOutboundEditorialCohortEdition(brief.editorialCohort),
    ],
    summaryTitle: "Summary deck",
    summaryBody: summaryBodyForLayout,
    themesTitle: topicTagsForLayout.length > 0 ? "Theme focus" : null,
    themesBody:
      topicTagsForLayout.length > 0 ? topicTagsForLayout.join(", ") : null,
    readingTitle: "Reading brief",
    readingSections: readingSectionsForLayout,
    readingParagraphs: flattenReadingSections(readingSectionsForLayout),
    vocabularyTitle: wordsToKnow?.title ?? null,
    vocabularyItems: vocabularyItemsForLayout,
    discussionTitle: talkAtHome?.title ?? "Discussion prompts",
    discussionPrompts: discussionPromptsForLayout,
    bigIdeaTitle: bigIdea?.title ?? null,
    bigIdeaBody: bigIdeaBodyForLayout,
    sourcesTitle: "Source references",
    sourceLines: brief.sourceReferences.map(
      (reference) => `${reference.sourceName} - ${reference.articleTitle}`,
    ),
    footerSignature: "Growth Education Limited",
  };
}
