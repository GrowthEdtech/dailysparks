import { createGeoPrompt, listGeoPrompts } from "./geo-prompt-store";
import type { GeoPromptRecord } from "./geo-prompt-schema";
import { GEO_WEBSITE_DERIVED_PROMPT_SEEDS } from "./geo-website-derived-prompts";

type SeedWebsiteDerivedGeoPromptsResult = {
  createdPrompts: GeoPromptRecord[];
  skippedPromptCount: number;
  totalSeedCount: number;
};

function normalizePromptKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function seedWebsiteDerivedGeoPrompts(): Promise<SeedWebsiteDerivedGeoPromptsResult> {
  const existingPrompts = await listGeoPrompts();
  const existingKeys = new Set(
    existingPrompts.flatMap((prompt) => [
      normalizePromptKey(prompt.prompt),
      normalizePromptKey(prompt.intentLabel),
    ]),
  );

  const createdPrompts: GeoPromptRecord[] = [];
  let skippedPromptCount = 0;

  for (const seed of GEO_WEBSITE_DERIVED_PROMPT_SEEDS) {
    const promptKey = normalizePromptKey(seed.prompt);
    const intentKey = normalizePromptKey(seed.intentLabel);

    if (existingKeys.has(promptKey) || existingKeys.has(intentKey)) {
      skippedPromptCount += 1;
      continue;
    }

    const createdPrompt = await createGeoPrompt(seed);
    createdPrompts.push(createdPrompt);
    existingKeys.add(promptKey);
    existingKeys.add(intentKey);
  }

  return {
    createdPrompts,
    skippedPromptCount,
    totalSeedCount: GEO_WEBSITE_DERIVED_PROMPT_SEEDS.length,
  };
}
