import type { Programme } from "./mvp-types";

export const PROMPT_POLICY_STATUSES = [
  "draft",
  "active",
  "archived",
] as const;

export type PromptPolicyStatus = (typeof PROMPT_POLICY_STATUSES)[number];

export type PromptPolicyRecord = {
  id: string;
  name: string;
  versionLabel: string;
  status: PromptPolicyStatus;
  sharedInstructions: string;
  antiRepetitionInstructions: string;
  outputContractInstructions: string;
  pypInstructions: string;
  mypInstructions: string;
  dpInstructions: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  activatedAt: string | null;
};

export type PromptPolicyResolvedPreviewByProgramme = Record<Programme, string>;

export const DEFAULT_PROMPT_POLICY_TEMPLATE = {
  name: "Family Daily Sparks Core",
  versionLabel: "v1.0.0",
  sharedInstructions:
    "Use clear, family-facing language, keep the facts grounded in cited sources, and stay suitable for parent-child reading.",
  antiRepetitionInstructions:
    "Avoid repeating the same topic angle, opening framing, and discussion prompt pattern used in the recent editorial memory window.",
  outputContractInstructions:
    "Return a concise headline, one-paragraph summary, source references, and a discussion-oriented brief in structured markdown.",
  pypInstructions:
    "Favor concrete examples, short sentences, and direct real-world connections a younger learner can explain back to a parent.",
  mypInstructions:
    "Add comparison, cause-and-effect framing, and enough context for a student to discuss why the issue matters.",
  dpInstructions:
    "Add analytical tension, note evidence limits, and present multiple plausible interpretations without collapsing them into one answer.",
  notes:
    "Starter template for Daily Sparks programme-specific prompt policy management.",
} as const;
