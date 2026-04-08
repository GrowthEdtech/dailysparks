import type { Programme } from "./mvp-types";

export const DAILY_BRIEF_LAYOUT_VARIANTS = [
  "standard",
  "pyp-one-page",
  "myp-bridge",
  "dp-academic",
] as const;

export type DailyBriefProductLayoutVariant =
  (typeof DAILY_BRIEF_LAYOUT_VARIANTS)[number];

export type DailyBriefProgrammeContentModel = {
  programme: Programme;
  tierLabel: string;
  layoutVariant: DailyBriefProductLayoutVariant;
  summaryTitle: string;
  themesTitle: string | null;
  readingTitle: string;
  vocabularyFallbackTitle: string | null;
  discussionFallbackTitle: string;
  bigIdeaFallbackTitle: string | null;
  knowledgeBankTitle: string;
  requiredSectionOrder: string[];
};

export type DailyBriefWeekendPolicy = {
  mode: "standard" | "weekend-vision" | "weekend-tok";
  label: string;
  promptNote: string;
};

function getProgrammeRuntimeIntentNotes(programme: Programme) {
  if (programme === "MYP") {
    return [
      "Treat MYP as a bridge-tier analytical reading experience for learners moving from explanation into structured comparison and inquiry.",
      "Global context must connect the story to a wider system, place, responsibility, or community consequence.",
      "Compare or connect should prompt structured comparison or cross-subject connection without turning the brief into a full essay.",
      "Inquiry question should invite compare, explain, predict, or connect thinking.",
      "Notebook prompt must invite a short saved reflection, not a full essay.",
    ];
  }

  if (programme === "DP") {
    return [
      "Treat DP as an academic evidence-and-argument reading experience.",
      "Claim must make a defensible interpretation grounded in the supplied sources rather than repeating surface facts.",
      "Counterpoint or evidence limit must name uncertainty, trade-off, or evidence weakness when the issue is contested or incomplete.",
      "TOK / essay prompt should invite evaluation, justification, and evidence-aware reasoning.",
      "Notebook capture must store one reusable academic idea or tension.",
    ];
  }

  return [
    "Treat PYP as a gentle, curiosity-led family reading experience.",
    "Keep the sections concrete, welcoming, and discussion-ready for home use.",
  ];
}

const MYP_REQUIRED_SECTION_ORDER = [
  "What's happening?",
  "Why does this matter?",
  "Global context",
  "Compare or connect",
  "Words to know",
  "Inquiry question",
  "Notebook prompt",
];

const DP_REQUIRED_SECTION_ORDER = [
  "3-sentence abstract",
  "Core issue",
  "Claim",
  "Counterpoint or evidence limit",
  "Why this matters for IB thinking",
  "Key academic term",
  "TOK / essay prompt",
  "Notebook capture",
];

const PROGRAMME_CONTENT_MODELS: Record<
  Programme,
  DailyBriefProgrammeContentModel
> = {
  PYP: {
    programme: "PYP",
    tierLabel: "Legacy curiosity tier",
    layoutVariant: "pyp-one-page",
    summaryTitle: "Summary deck",
    themesTitle: "Theme focus",
    readingTitle: "Reading brief",
    vocabularyFallbackTitle: "Words to know",
    discussionFallbackTitle: "Discussion prompts",
    bigIdeaFallbackTitle: "Big idea",
    knowledgeBankTitle: "Family reflection notes",
    requiredSectionOrder: [
      "What's happening?",
      "Why does this matter?",
      "Picture it",
      "Words to know",
      "Talk about it at home",
      "Big idea",
    ],
  },
  MYP: {
    programme: "MYP",
    tierLabel: "Bridge tier",
    layoutVariant: "myp-bridge",
    summaryTitle: "Bridge brief",
    themesTitle: "Focus areas",
    readingTitle: "Context and comparison",
    vocabularyFallbackTitle: "Words to know",
    discussionFallbackTitle: "Inquiry question",
    bigIdeaFallbackTitle: "Notebook prompt",
    knowledgeBankTitle: "Inquiry notebook",
    requiredSectionOrder: MYP_REQUIRED_SECTION_ORDER,
  },
  DP: {
    programme: "DP",
    tierLabel: "Academic tier",
    layoutVariant: "dp-academic",
    summaryTitle: "3-sentence abstract",
    themesTitle: "Focus areas",
    readingTitle: "Academic frame",
    vocabularyFallbackTitle: "Key academic term",
    discussionFallbackTitle: "TOK / essay prompt",
    bigIdeaFallbackTitle: "Notebook capture",
    knowledgeBankTitle: "Academic idea bank",
    requiredSectionOrder: DP_REQUIRED_SECTION_ORDER,
  },
};

function getDayOfWeek(scheduledFor: string) {
  const parsed = new Date(`${scheduledFor}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.getUTCDay();
}

function isWeekend(scheduledFor: string) {
  const dayOfWeek = getDayOfWeek(scheduledFor);

  return dayOfWeek === 0 || dayOfWeek === 6;
}

export function getDailyBriefProgrammeContentModel(programme: Programme) {
  return PROGRAMME_CONTENT_MODELS[programme];
}

export function getWeekendDeliveryPolicy(
  programme: Programme,
  scheduledFor: string,
): DailyBriefWeekendPolicy {
  if (!isWeekend(scheduledFor)) {
    return {
      mode: "standard",
      label: "Weekday rhythm",
      promptNote:
        "Use the standard programme framing and keep the brief aligned with the normal weekday academic rhythm.",
    };
  }

  if (programme === "MYP") {
    return {
      mode: "weekend-vision",
      label: "Vision day",
      promptNote:
        "Favor global culture, future-facing technology, or cross-disciplinary curiosity framing so the weekend brief broadens perspective without losing analytical clarity.",
    };
  }

  if (programme === "DP") {
    return {
      mode: "weekend-tok",
      label: "TOK day",
      promptNote:
        "Favor ethics, knowledge questions, interdisciplinary controversy, and evidence limits so the weekend brief sharpens TOK-style reflection and academic judgment.",
    };
  }

  return {
    mode: "standard",
    label: "Family reflection day",
    promptNote:
      "Keep the weekend brief discussion-friendly and gentle, with reflective questions a family can explore together.",
  };
}

export function buildDailyBriefRuntimeContract(
  programme: Programme,
  scheduledFor: string,
) {
  const contentModel = getDailyBriefProgrammeContentModel(programme);
  const weekendPolicy = getWeekendDeliveryPolicy(programme, scheduledFor);

  return [
    "Runtime contract overlay",
    "If any editable house-style instruction conflicts with the runtime contract below, follow the runtime contract.",
    `Programme tier: ${contentModel.tierLabel}`,
    `Use this exact section order: ${contentModel.requiredSectionOrder.join(" -> ")}.`,
    `Reading surface title: ${contentModel.readingTitle}`,
    `Discussion surface title: ${contentModel.discussionFallbackTitle}`,
    `Knowledge bank target: ${contentModel.knowledgeBankTitle}`,
    `Weekend delivery mode: ${weekendPolicy.label}`,
    `Weekend framing note: ${weekendPolicy.promptNote}`,
    ...getProgrammeRuntimeIntentNotes(programme),
  ].join("\n");
}
