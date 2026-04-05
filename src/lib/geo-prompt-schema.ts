import type { Programme } from "./mvp-types";

export const GEO_PROMPT_PRIORITIES = ["high", "medium", "watch"] as const;
export const GEO_ENGINE_TYPES = [
  "chatgpt-search",
  "perplexity",
  "google-ai-overviews",
  "gemini",
  "claude",
] as const;

export type GeoPromptPriority = (typeof GEO_PROMPT_PRIORITIES)[number];
export type GeoEngineType = (typeof GEO_ENGINE_TYPES)[number];

export type GeoPromptRecord = {
  id: string;
  prompt: string;
  intentLabel: string;
  priority: GeoPromptPriority;
  targetProgrammes: Programme[];
  engineCoverage: GeoEngineType[];
  fanOutHints: string[];
  active: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
};
