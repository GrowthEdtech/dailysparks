import type { GeoPromptRecord } from "./geo-prompt-schema";

export type GeoPromptIntentBucket = "workflow" | "habit-building" | "general";

const GEO_WORKFLOW_INTENT_PATTERNS = [
  /\bworkflow\b/,
  /\bgoodnotes\b/,
  /\bnotion\b/,
  /\bdelivery\b/,
  /\bdeliver\b/,
  /\barchive\b/,
  /\bipad\b/,
  /\bsetup\b/,
  /\bsync\b/,
  /\btemplate\b/,
  /\bannotation\b/,
  /\bbriefs?\b/,
] as const;

const GEO_HABIT_INTENT_PATTERNS = [
  /\bhabit\b/,
  /\broutine\b/,
  /\bsupport at home\b/,
  /\breading support\b/,
  /\bparent visibility\b/,
  /\bcritical reasoning\b/,
  /\bwriting\b/,
  /\bfamily reading\b/,
  /\bat home\b/,
] as const;

function normalizeIntentText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function matchesAnyPattern(
  responseText: string,
  patterns: readonly RegExp[],
) {
  return patterns.some((pattern) => pattern.test(responseText));
}

export function inferGeoPromptIntentBucket(input: {
  prompt: string;
  intentLabel: string;
  queryVariant?: string;
}) {
  const normalizedIntentText = normalizeIntentText(
    `${input.prompt} ${input.intentLabel} ${input.queryVariant ?? ""}`,
  );

  if (matchesAnyPattern(normalizedIntentText, GEO_WORKFLOW_INTENT_PATTERNS)) {
    return "workflow" as const;
  }

  if (matchesAnyPattern(normalizedIntentText, GEO_HABIT_INTENT_PATTERNS)) {
    return "habit-building" as const;
  }

  return "general" as const;
}

export function inferGeoPromptIntentBucketFromPrompt(
  prompt: Pick<GeoPromptRecord, "prompt" | "intentLabel">,
  queryVariant?: string,
) {
  return inferGeoPromptIntentBucket({
    prompt: prompt.prompt,
    intentLabel: prompt.intentLabel,
    queryVariant,
  });
}
