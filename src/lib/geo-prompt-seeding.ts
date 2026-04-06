import { createGeoPrompt, listGeoPrompts, updateGeoPrompt } from "./geo-prompt-store";
import type { GeoPromptRecord } from "./geo-prompt-schema";
import { GEO_WEBSITE_DERIVED_PROMPT_SEEDS } from "./geo-website-derived-prompts";

type SeedWebsiteDerivedGeoPromptsResult = {
  createdPrompts: GeoPromptRecord[];
  updatedPrompts: GeoPromptRecord[];
  skippedPromptCount: number;
  totalSeedCount: number;
};

function normalizePromptKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeStringList(values: string[]) {
  return [...values].map((value) => value.trim()).filter(Boolean).sort();
}

function normalizeProgrammeList(values: GeoPromptRecord["targetProgrammes"]) {
  return [...values].sort();
}

function promptMatchesSeed(existingPrompt: GeoPromptRecord, seedPrompt: typeof GEO_WEBSITE_DERIVED_PROMPT_SEEDS[number]) {
  return (
    existingPrompt.prompt === seedPrompt.prompt &&
    existingPrompt.intentLabel === seedPrompt.intentLabel &&
    existingPrompt.priority === seedPrompt.priority &&
    JSON.stringify(normalizeProgrammeList(existingPrompt.targetProgrammes)) ===
      JSON.stringify(normalizeProgrammeList(seedPrompt.targetProgrammes)) &&
    JSON.stringify(normalizeStringList(existingPrompt.engineCoverage)) ===
      JSON.stringify(normalizeStringList(seedPrompt.engineCoverage)) &&
    JSON.stringify(normalizeStringList(existingPrompt.fanOutHints)) ===
      JSON.stringify(normalizeStringList(seedPrompt.fanOutHints)) &&
    existingPrompt.active === seedPrompt.active &&
    existingPrompt.notes === seedPrompt.notes
  );
}

export async function seedWebsiteDerivedGeoPrompts(): Promise<SeedWebsiteDerivedGeoPromptsResult> {
  const existingPrompts = await listGeoPrompts();
  const existingPromptsByKey = new Map<string, GeoPromptRecord>();
  for (const prompt of existingPrompts) {
    existingPromptsByKey.set(normalizePromptKey(prompt.prompt), prompt);
    existingPromptsByKey.set(normalizePromptKey(prompt.intentLabel), prompt);
  }

  const createdPrompts: GeoPromptRecord[] = [];
  const updatedPrompts: GeoPromptRecord[] = [];
  let skippedPromptCount = 0;

  for (const seed of GEO_WEBSITE_DERIVED_PROMPT_SEEDS) {
    const promptKey = normalizePromptKey(seed.prompt);
    const intentKey = normalizePromptKey(seed.intentLabel);
    const existingPrompt =
      existingPromptsByKey.get(promptKey) ?? existingPromptsByKey.get(intentKey);

    if (existingPrompt) {
      if (promptMatchesSeed(existingPrompt, seed)) {
        skippedPromptCount += 1;
        continue;
      }

      const updatedPrompt = await updateGeoPrompt(existingPrompt.id, seed);

      if (updatedPrompt) {
        updatedPrompts.push(updatedPrompt);
        existingPromptsByKey.set(promptKey, updatedPrompt);
        existingPromptsByKey.set(intentKey, updatedPrompt);
      } else {
        skippedPromptCount += 1;
      }
      continue;
    }

    const createdPrompt = await createGeoPrompt(seed);
    createdPrompts.push(createdPrompt);
    existingPromptsByKey.set(promptKey, createdPrompt);
    existingPromptsByKey.set(intentKey, createdPrompt);
  }

  return {
    createdPrompts,
    updatedPrompts,
    skippedPromptCount,
    totalSeedCount: GEO_WEBSITE_DERIVED_PROMPT_SEEDS.length,
  };
}
