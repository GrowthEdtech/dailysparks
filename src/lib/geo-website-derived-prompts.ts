import type { CreateGeoPromptInput } from "./geo-prompt-store";

export type GeoContentPageStructureSuggestion = {
  title: string;
  recommendedSlug: string;
  primaryIntent: string;
  whyNow: string;
  targetPrompts: string[];
  sections: string[];
};

export const GEO_WEBSITE_DERIVED_PROMPT_SEEDS: CreateGeoPromptInput[] = [
  {
    prompt: "IB reading workflow for families",
    intentLabel: "IB family workflow",
    priority: "high",
    targetProgrammes: ["PYP", "MYP", "DP"],
    engineCoverage: ["chatgpt-search"],
    fanOutHints: [
      "IB family reading routine",
      "family reading workflow for IB students",
    ],
    active: true,
    notes:
      "Grounded in the homepage promise around daily reading support and family visibility.",
  },
  {
    prompt: "daily reading habit for IB students",
    intentLabel: "Daily IB reading habit",
    priority: "high",
    targetProgrammes: ["PYP", "MYP", "DP"],
    engineCoverage: ["chatgpt-search"],
    fanOutHints: [
      "daily reading habit for middle school students",
      "IB reading routine at home",
    ],
    active: true,
    notes:
      "Anchored to the site narrative around daily academic habit and distraction-free reading.",
  },
  {
    prompt: "Goodnotes delivery for student reading briefs",
    intentLabel: "Goodnotes delivery workflow",
    priority: "high",
    targetProgrammes: ["PYP", "MYP", "DP"],
    engineCoverage: ["chatgpt-search"],
    fanOutHints: [
      "Goodnotes reading brief workflow",
      "student reading briefs on Goodnotes",
    ],
    active: true,
    notes:
      "Derived from the current Goodnotes-first product delivery promise on the public site.",
  },
  {
    prompt: "Notion archive for parent learning visibility",
    intentLabel: "Notion parent archive",
    priority: "medium",
    targetProgrammes: ["PYP", "MYP", "DP"],
    engineCoverage: ["chatgpt-search"],
    fanOutHints: [
      "Notion archive for parents",
      "family learning visibility in Notion",
    ],
    active: true,
    notes:
      "Mapped to the current Notion archive positioning and parent visibility language.",
  },
  {
    prompt: "distraction-free iPad reading workflow for kids",
    intentLabel: "Distraction-free iPad reading",
    priority: "medium",
    targetProgrammes: ["PYP", "MYP"],
    engineCoverage: ["chatgpt-search"],
    fanOutHints: [
      "iPad reading workflow for kids",
      "distraction-free reading setup for children",
    ],
    active: true,
    notes:
      "Built from the public promise around calmer reading workflows and focused device use.",
  },
  {
    prompt: "PYP and MYP reading support at home",
    intentLabel: "Programme support at home",
    priority: "medium",
    targetProgrammes: ["PYP", "MYP"],
    engineCoverage: ["chatgpt-search"],
    fanOutHints: [
      "PYP reading support for parents",
      "MYP reading support at home",
    ],
    active: true,
    notes:
      "Tied to programme-aligned messaging that already appears across the marketing site.",
  },
  {
    prompt: "English writing and critical reasoning habit for ages 9-14",
    intentLabel: "Writing and reasoning habit",
    priority: "medium",
    targetProgrammes: ["PYP", "MYP"],
    engineCoverage: ["chatgpt-search"],
    fanOutHints: [
      "critical reasoning habit for children",
      "English writing habit for ages 9 to 14",
    ],
    active: true,
    notes:
      "Grounded in the site's promise about English writing and critical reasoning development.",
  },
  {
    prompt: "Daily Sparks family reading routine",
    intentLabel: "Daily Sparks brand routine",
    priority: "watch",
    targetProgrammes: ["PYP", "MYP", "DP"],
    engineCoverage: ["chatgpt-search"],
    fanOutHints: [
      "Daily Sparks routine for families",
      "how Daily Sparks works for IB families",
    ],
    active: true,
    notes:
      "Direct brand-intent prompt to measure whether the public narrative is legible to AI engines.",
  },
];

export const GEO_CONTENT_PAGE_STRUCTURE_SUGGESTIONS: GeoContentPageStructureSuggestion[] =
  [
    {
      title: "Goodnotes and Notion workflow page",
      recommendedSlug: "/how-it-works/goodnotes-notion-family-workflow",
      primaryIntent: "Explain the real delivery flow and parent visibility loop.",
      whyNow:
        "This is the highest-value missing GEO support page because both Goodnotes delivery and Notion archive are already promised on the site.",
      targetPrompts: [
        "Goodnotes delivery for student reading briefs",
        "Notion archive for parent learning visibility",
        "Daily Sparks family reading routine",
      ],
      sections: [
        "What arrives in Goodnotes each day",
        "How the Notion archive helps parents track reading",
        "What a family reading session looks like in practice",
        "Who this workflow is best for",
        "Frequently asked workflow questions",
      ],
    },
    {
      title: "IB family reading workflow page",
      recommendedSlug: "/how-it-works/ib-family-reading-workflow",
      primaryIntent: "Answer how Daily Sparks supports a repeatable IB family reading routine.",
      whyNow:
        "This page gives AI systems a direct answer page for the strongest top-of-funnel family workflow prompt.",
      targetPrompts: [
        "IB reading workflow for families",
        "daily reading habit for IB students",
        "PYP and MYP reading support at home",
      ],
      sections: [
        "What the daily IB family reading rhythm looks like",
        "How parents can support without turning reading into homework",
        "How PYP, MYP, and DP needs differ",
        "Why consistency matters more than reading volume",
        "Questions families usually ask before starting",
      ],
    },
    {
      title: "PYP and MYP at-home support page",
      recommendedSlug: "/programme-support/pyp-myp-reading-support-at-home",
      primaryIntent: "Clarify how the product supports ages 9-14 at home with age-appropriate reading habits.",
      whyNow:
        "The public site already hints at this outcome, but there is not yet a page that clearly answers it in search-friendly form.",
      targetPrompts: [
        "PYP and MYP reading support at home",
        "English writing and critical reasoning habit for ages 9-14",
        "distraction-free iPad reading workflow for kids",
      ],
      sections: [
        "What support looks like for PYP learners",
        "What changes for MYP learners",
        "How reading connects to writing and reasoning",
        "How to keep device-based reading calm and focused",
        "Parent cues to look for over the first month",
      ],
    },
  ];
