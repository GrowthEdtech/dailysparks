import type { Programme } from "./mvp-types";

export type EditorialSourceRole =
  | "daily-news"
  | "explainer"
  | "pyp-friendly"
  | "source-of-record";

export type EditorialUsageTier =
  | "primary-selection"
  | "background-context"
  | "fact-check";

export type EditorialSource = {
  id: string;
  name: string;
  homepage: string;
  roles: EditorialSourceRole[];
  usageTiers: EditorialUsageTier[];
  summary: string;
};

export type EditorialProgrammeProfile = {
  programme: Programme;
  readingMode: "curiosity-led" | "analysis-led" | "argument-led";
  contentGoal: string;
  promptFocus: string;
};

export type RepetitionWindowRule = {
  windowDays: number;
};

export type DailySparksRepetitionPolicy = {
  sourceReuse: RepetitionWindowRule & {
    maxUsesPerSource: number;
  };
  topicReuse: RepetitionWindowRule & {
    maxSelectionsPerCluster: number;
  };
  angleReuse: RepetitionWindowRule & {
    maxReusesPerAngle: number;
  };
  questionTemplateReuse: RepetitionWindowRule & {
    maxReusesPerTemplate: number;
  };
};

export const DAILY_SPARKS_ANTI_PLASTIC_WORDS = [
  "delve",
  "tapestry",
  "in conclusion",
  "furthermore",
  "landscape",
  "testament",
  "beacon",
  "embark",
  "a testament to",
  "in a world where",
  "unleash",
  "intricate",
  "realm",
  "crucial", 
  "vital",
  "let's dive in",
  "ultimately",
  "navigating",
] as const;

export const DAILY_SPARKS_SOURCE_WHITELIST_V1: EditorialSource[] = [
  {
    id: "reuters",
    name: "Reuters",
    homepage: "https://www.reuters.com/",
    roles: ["daily-news"],
    usageTiers: ["primary-selection", "background-context"],
    summary: "Fast global baseline reporting for major events and market-moving developments.",
  },
  {
    id: "ap",
    name: "Associated Press",
    homepage: "https://apnews.com/",
    roles: ["daily-news"],
    usageTiers: ["primary-selection", "background-context"],
    summary: "Reliable event coverage across global, U.S., and civic current affairs.",
  },
  {
    id: "bbc",
    name: "BBC",
    homepage: "https://www.bbc.com/news",
    roles: ["daily-news", "explainer"],
    usageTiers: ["primary-selection", "background-context"],
    summary: "Balanced international reporting with strong explainers and human-angle coverage.",
  },
  {
    id: "npr",
    name: "NPR",
    homepage: "https://www.npr.org/",
    roles: ["daily-news", "explainer"],
    usageTiers: ["primary-selection", "background-context"],
    summary: "Useful for social, cultural, education, and family-discussion-oriented stories.",
  },
  {
    id: "science-news",
    name: "Science News",
    homepage: "https://www.sciencenews.org/",
    roles: ["explainer"],
    usageTiers: ["background-context"],
    summary: "Science reporting and research translation for deeper analytical briefs.",
  },
  {
    id: "science-news-explores",
    name: "Science News Explores",
    homepage: "https://www.snexplores.org/",
    roles: ["explainer", "pyp-friendly"],
    usageTiers: ["background-context"],
    summary: "Student-friendly science explainers that bridge curiosity and real-world learning.",
  },
  {
    id: "unicef",
    name: "UNICEF",
    homepage: "https://www.unicef.org/stories",
    roles: ["pyp-friendly", "source-of-record"],
    usageTiers: ["background-context", "fact-check"],
    summary: "Children, education, and global human-impact stories with strong institutional grounding.",
  },
  {
    id: "who",
    name: "WHO",
    homepage: "https://www.who.int/news-room",
    roles: ["source-of-record"],
    usageTiers: ["fact-check"],
    summary: "Public-health and science claims source-of-record for medical or health-related topics.",
  },
  {
    id: "national-geographic",
    name: "National Geographic",
    homepage: "https://www.nationalgeographic.com/science/",
    roles: ["explainer", "pyp-friendly"],
    usageTiers: ["background-context"],
    summary: "Natural world, science, environment, and curiosity-rich context for family reading.",
  },
  {
    id: "smithsonian-magazine",
    name: "Smithsonian Magazine",
    homepage: "https://www.smithsonianmag.com/",
    roles: ["explainer"],
    usageTiers: ["background-context"],
    summary: "Strong history, culture, science, and idea-driven context for older learners.",
  },
];

const RECOMMENDED_SOURCE_IDS_BY_PROGRAMME: Record<Programme, string[]> = {
  PYP: [
    "science-news-explores",
    "unicef",
    "national-geographic",
    "bbc",
    "npr",
  ],
  MYP: [
    "reuters",
    "ap",
    "bbc",
    "npr",
    "science-news",
    "unicef",
    "who",
  ],
  DP: [
    "reuters",
    "ap",
    "bbc",
    "npr",
    "science-news",
    "smithsonian-magazine",
    "who",
  ],
};

const EDITORIAL_PROGRAMME_PROFILES: Record<Programme, EditorialProgrammeProfile> = {
  PYP: {
    programme: "PYP",
    readingMode: "curiosity-led",
    contentGoal:
      "Keep the brief concrete, welcoming, and easy to discuss at home without heavy background load.",
    promptFocus:
      "Use clear world-building, concrete examples, and reflection questions the learner can answer aloud.",
  },
  MYP: {
    programme: "MYP",
    readingMode: "analysis-led",
    contentGoal:
      "Build transition-level academic reading (target CEFR B1-B2 / Lexile 800L-1000L). Connect current events to global contexts, comparison, and inquiry-driven interpretation. Limit sentence lengths to 25 words max for rapid reading.",
    promptFocus:
      "Highlight causes, trade-offs, perspective differences, global context, and one inquiry prompt the learner can carry into a notebook.",
  },
  DP: {
    programme: "DP",
    readingMode: "argument-led",
    contentGoal:
      "Support academic framing (target CEFR C1 / Lexile 1100L-1300L), evidence-aware interpretation, and claim-versus-counterpoint habits that help with TOK, EE, and essay thinking. Be ruthlessly succinct.",
    promptFocus:
      "Surface a core issue, a defensible claim, an evidence limit or counterpoint, and a TOK or essay-style prompt that rewards justified reasoning.",
  },
};

export const DAILY_SPARKS_REPETITION_POLICY: DailySparksRepetitionPolicy = {
  sourceReuse: {
    windowDays: 7,
    maxUsesPerSource: 2,
  },
  topicReuse: {
    windowDays: 14,
    maxSelectionsPerCluster: 1,
  },
  angleReuse: {
    windowDays: 14,
    maxReusesPerAngle: 1,
  },
  questionTemplateReuse: {
    windowDays: 30,
    maxReusesPerTemplate: 1,
  },
};

function getSourceById(sourceId: string) {
  return DAILY_SPARKS_SOURCE_WHITELIST_V1.find((source) => source.id === sourceId);
}

export function getEditorialProgrammeProfile(
  programme: Programme,
): EditorialProgrammeProfile {
  return EDITORIAL_PROGRAMME_PROFILES[programme];
}

export function getRecommendedSourcesForProgramme(
  programme: Programme,
): EditorialSource[] {
  return RECOMMENDED_SOURCE_IDS_BY_PROGRAMME[programme]
    .map(getSourceById)
    .filter((source): source is EditorialSource => Boolean(source));
}
