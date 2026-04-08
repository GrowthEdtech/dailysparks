import type { Programme } from "./mvp-types";

export type DailyBriefNormalizedReadingSection = {
  title: string | null;
  body: string;
};

const PROGRAMME_READING_TITLES: Record<Programme, string[]> = {
  PYP: ["What's happening?", "Why does this matter?", "Picture it"],
  MYP: [
    "What's happening?",
    "Why does this matter?",
    "Global context",
    "Compare or connect",
  ],
  DP: [
    "Core issue",
    "Claim",
    "Counterpoint or evidence limit",
    "Why this matters for IB thinking",
  ],
};

export function normalizeDailyBriefReadingSectionsV2(input: {
  programme: Programme;
  sections: DailyBriefNormalizedReadingSection[];
  summary: string;
}): DailyBriefNormalizedReadingSection[] {
  const { programme, sections, summary } = input;

  if (sections.some((section) => section.title)) {
    return sections;
  }

  if (sections.length === 0 && summary.trim()) {
    return [
      {
        title: programme === "PYP" ? null : PROGRAMME_READING_TITLES[programme][0] ?? null,
        body: summary.trim(),
      },
    ];
  }

  if (programme === "PYP") {
    return sections;
  }

  return sections.map((section, index) => ({
    ...section,
    title: PROGRAMME_READING_TITLES[programme][index] ?? section.title,
  }));
}

export function getDailyBriefProgrammeDiscussionFallbacks(programme: Programme) {
  if (programme === "MYP") {
    return [
      "What global context or system-level connection stands out most in this brief?",
    ];
  }

  if (programme === "DP") {
    return [
      "Which claim in this brief feels strongest, and what evidence limit or counterpoint should you keep in view?",
    ];
  }

  return [
    "What feels most important in today's story?",
    "Which detail would you like to understand more clearly?",
    "How does this connect to your own world or experience?",
  ];
}

export function getDailyBriefProgrammeNotebookFallback(programme: Programme) {
  if (programme === "MYP") {
    return "Write 2-3 sentences linking this brief to a wider system, place, or community impact.";
  }

  if (programme === "DP") {
    return "Capture one arguable claim, one evidence limit, and one question you would test further.";
  }

  return null;
}
