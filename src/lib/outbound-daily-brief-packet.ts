import type { DailyBriefEditorialCohort } from "./daily-brief-cohorts";
import type { DailyBriefSourceReference } from "./daily-brief-history-schema";
import {
  getDailyBriefProgrammeContentModel,
  getWeekendDeliveryPolicy,
  type DailyBriefProductLayoutVariant,
} from "./daily-brief-product-policy";
import {
  getDailyBriefProgrammeDiscussionFallbacks,
  getDailyBriefProgrammeNotebookFallback,
  normalizeDailyBriefReadingSectionsV2,
} from "./daily-brief-content-normalizer";
import type { Programme } from "./mvp-types";

export type OutboundDailyBriefReadingSection = {
  title: string | null;
  body: string;
};

export type OutboundDailyBriefVocabularyItem = {
  term: string;
  definition: string;
};

export type OutboundDailyBriefPacket = {
  layoutVariant: DailyBriefProductLayoutVariant;
  programme: Programme;
  scheduledFor: string;
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
  | "globalContext"
  | "compareOrConnect"
  | "threeSentenceAbstract"
  | "coreIssue"
  | "claim"
  | "counterpointOrEvidenceLimit"
  | "whyThisMattersForIbThinking"
  | "keyAcademicTerm"
  | "wordsToKnow"
  | "talkAboutItAtHome"
  | "inquiryQuestion"
  | "tokEssayPrompt"
  | "notebookPrompt"
  | "notebookCapture"
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
    key: "globalContext",
    title: "Global context",
    pattern: /global context(?:\?|:)?/i,
  },
  {
    key: "compareOrConnect",
    title: "Compare or connect",
    pattern: /compare or connect(?:\?|:)?/i,
  },
  {
    key: "threeSentenceAbstract",
    title: "3-sentence abstract",
    pattern: /3-sentence abstract(?:\?|:)?/i,
  },
  {
    key: "coreIssue",
    title: "Core issue",
    pattern: /core issue(?:\?|:)?/i,
  },
  {
    key: "claim",
    title: "Claim",
    pattern: /claim(?:\?|:)?/i,
  },
  {
    key: "counterpointOrEvidenceLimit",
    title: "Counterpoint or evidence limit",
    pattern: /counterpoint or evidence limit(?:\?|:)?/i,
  },
  {
    key: "whyThisMattersForIbThinking",
    title: "Why this matters for IB thinking",
    pattern: /why this matters for ib thinking(?:\?|:)?/i,
  },
  {
    key: "keyAcademicTerm",
    title: "Key academic term",
    pattern: /key academic term(?:\?|:)?/i,
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
    key: "inquiryQuestion",
    title: "Inquiry question",
    pattern: /inquiry question(?:\?|:)?/i,
  },
  {
    key: "tokEssayPrompt",
    title: "TOK \/ essay prompt",
    pattern: /tok\s*\/\s*essay prompt(?:\?|:)?/i,
  },
  {
    key: "notebookPrompt",
    title: "Notebook prompt",
    pattern: /notebook prompt(?:\?|:)?/i,
  },
  {
    key: "notebookCapture",
    title: "Notebook capture",
    pattern: /notebook capture(?:\?|:)?/i,
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

function parseSinglePrompt(value: string) {
  const sanitized = sanitizePlainText(value);

  return sanitized ? [sanitized] : [];
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

function applyMypBridgePolicyToReadingSections(
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
  const programme = normalizedProgramme as Programme;
  const contentModel = getDailyBriefProgrammeContentModel(programme);
  const weekendPolicy = getWeekendDeliveryPolicy(programme, brief.scheduledFor);
  const layoutVariant = contentModel.layoutVariant;
  const structuredSections = extractStructuredSections(brief.briefMarkdown);
  const primarySectionKeys =
    programme === "MYP"
      ? [
          "whatsHappening",
          "whyDoesThisMatter",
          "globalContext",
          "compareOrConnect",
        ]
      : programme === "DP"
        ? [
            "coreIssue",
            "claim",
            "counterpointOrEvidenceLimit",
            "whyThisMattersForIbThinking",
          ]
        : ["whatsHappening", "whyDoesThisMatter", "pictureIt"];
  const readingSections = (
    primarySectionKeys
      .map((key) => structuredSections.get(key as StructuredSectionKey))
      .filter(Boolean) as { title: string; body: string }[]
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
  const wordsToKnow =
    programme === "DP"
      ? structuredSections.get("keyAcademicTerm")
      : structuredSections.get("wordsToKnow");
  const talkAtHome =
    programme === "MYP"
      ? structuredSections.get("inquiryQuestion")
      : programme === "DP"
        ? structuredSections.get("tokEssayPrompt")
        : structuredSections.get("talkAboutItAtHome");
  const bigIdea =
    programme === "MYP"
      ? structuredSections.get("notebookPrompt")
      : programme === "DP"
        ? structuredSections.get("notebookCapture")
        : structuredSections.get("bigIdea");
  const baseReadingSections = normalizeDailyBriefReadingSectionsV2({
    programme,
    sections: fallbackReadingSections,
    summary: brief.summary,
  });
  const readingSectionsForLayout =
    layoutVariant === "pyp-one-page"
      ? applyPypOnePagePolicyToReadingSections(baseReadingSections)
      : layoutVariant === "myp-bridge"
        ? applyMypBridgePolicyToReadingSections(baseReadingSections)
      : baseReadingSections;
  const vocabularyItems = wordsToKnow ? parseVocabularyItems(wordsToKnow.body) : [];
  const discussionPrompts = talkAtHome
    ? programme === "MYP" || programme === "DP"
      ? parseSinglePrompt(talkAtHome.body)
      : parseDiscussionPrompts(talkAtHome.body)
    : getDailyBriefProgrammeDiscussionFallbacks(programme);
  const threeSentenceAbstract = structuredSections.get("threeSentenceAbstract");
  const topicTagsForLayout =
    layoutVariant === "pyp-one-page"
      ? brief.topicTags.slice(0, 4)
      : layoutVariant === "myp-bridge"
        ? brief.topicTags.slice(0, 5)
        : brief.topicTags;
  const summaryBodyForLayout =
    layoutVariant === "pyp-one-page"
      ? truncateSentenceBudget(brief.summary, {
          maxSentences: 2,
          maxCharacters: 180,
        })
      : layoutVariant === "myp-bridge"
        ? truncateSentenceBudget(brief.summary, {
          maxSentences: 2,
          maxCharacters: 240,
        })
      : layoutVariant === "dp-academic"
        ? truncateSentenceBudget(threeSentenceAbstract?.body || brief.summary, {
            maxSentences: 3,
            maxCharacters: 320,
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
      : layoutVariant === "myp-bridge"
        ? vocabularyItems.slice(0, 3).map((item) => ({
            ...item,
            definition: truncateSentenceBudget(item.definition, {
              maxSentences: 1,
              maxCharacters: 120,
            }),
          }))
      : layoutVariant === "dp-academic"
        ? vocabularyItems.slice(0, 2).map((item) => ({
            ...item,
            definition: truncateSentenceBudget(item.definition, {
              maxSentences: 1,
              maxCharacters: 160,
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
      : layoutVariant === "myp-bridge"
        ? discussionPrompts.slice(0, 3).map((prompt) =>
            truncateSentenceBudget(prompt, {
              maxSentences: 1,
              maxCharacters: 110,
            }),
          )
      : layoutVariant === "dp-academic"
        ? discussionPrompts.slice(0, 2).map((prompt) =>
            truncateSentenceBudget(prompt, {
              maxSentences: 1,
              maxCharacters: 160,
            }),
          )
      : discussionPrompts;
  const fallbackNotebookBody = getDailyBriefProgrammeNotebookFallback(programme);
  const resolvedBigIdeaBody = bigIdea?.body ?? fallbackNotebookBody;
  const bigIdeaBodyForLayout = resolvedBigIdeaBody
    ? layoutVariant === "pyp-one-page"
      ? truncateSentenceBudget(resolvedBigIdeaBody, {
          maxSentences: 1,
        })
      : layoutVariant === "myp-bridge"
        ? truncateSentenceBudget(resolvedBigIdeaBody, {
            maxSentences: 2,
            maxCharacters: 220,
          })
      : layoutVariant === "dp-academic"
        ? truncateSentenceBudget(resolvedBigIdeaBody, {
            maxSentences: 2,
            maxCharacters: 220,
          })
      : resolvedBigIdeaBody
    : null;
  const metadataItems = [
    formatOutboundScheduledDateLabel(brief.scheduledFor),
    `${brief.programme} edition`,
    formatOutboundEditorialCohortEdition(brief.editorialCohort),
  ];

  if (weekendPolicy.mode !== "standard") {
    metadataItems.push(weekendPolicy.label);
  }

  return {
    layoutVariant,
    programme,
    scheduledFor: brief.scheduledFor,
    eyebrow: "Daily Sparks",
    title: brief.headline,
    metadataItems,
    summaryTitle: contentModel.summaryTitle,
    summaryBody: summaryBodyForLayout,
    themesTitle:
      topicTagsForLayout.length > 0 ? contentModel.themesTitle : null,
    themesBody:
      topicTagsForLayout.length > 0 ? topicTagsForLayout.join(", ") : null,
    readingTitle: contentModel.readingTitle,
    readingSections: readingSectionsForLayout,
    readingParagraphs: flattenReadingSections(readingSectionsForLayout),
    vocabularyTitle:
      wordsToKnow?.title ??
      (vocabularyItemsForLayout.length > 0
        ? contentModel.vocabularyFallbackTitle
        : null),
    vocabularyItems: vocabularyItemsForLayout,
    discussionTitle:
      talkAtHome?.title ?? contentModel.discussionFallbackTitle,
    discussionPrompts: discussionPromptsForLayout,
    bigIdeaTitle:
      bigIdea?.title ??
      (bigIdeaBodyForLayout ? contentModel.bigIdeaFallbackTitle : null),
    bigIdeaBody: bigIdeaBodyForLayout,
    sourcesTitle: "Source references",
    sourceLines: brief.sourceReferences.map(
      (reference) => `${reference.sourceName} - ${reference.articleTitle}`,
    ),
    footerSignature: "Growth Education Limited",
  };
}
