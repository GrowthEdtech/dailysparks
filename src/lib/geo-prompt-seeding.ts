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

function normalizeSeedId(value: string | null | undefined) {
  return typeof value === "string" && value.trim()
    ? value.trim().toLowerCase()
    : null;
}

function promptMatchesSeed(existingPrompt: GeoPromptRecord, seedPrompt: typeof GEO_WEBSITE_DERIVED_PROMPT_SEEDS[number]) {
  return (
    normalizeSeedId(existingPrompt.websiteDerivedSeedId) ===
      normalizeSeedId(seedPrompt.websiteDerivedSeedId) &&
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
  const existingPromptsBySeedId = new Map<string, GeoPromptRecord>();
  const existingPromptsByPrompt = new Map<string, GeoPromptRecord>();
  for (const prompt of existingPrompts) {
    const seedId = normalizeSeedId(prompt.websiteDerivedSeedId);

    if (seedId) {
      existingPromptsBySeedId.set(seedId, prompt);
    }

    existingPromptsByPrompt.set(normalizePromptKey(prompt.prompt), prompt);
  }

  const createdPrompts: GeoPromptRecord[] = [];
  const updatedPrompts: GeoPromptRecord[] = [];
  let skippedPromptCount = 0;

  for (const seed of GEO_WEBSITE_DERIVED_PROMPT_SEEDS) {
    const seedId = normalizeSeedId(seed.websiteDerivedSeedId);
    const promptKey = normalizePromptKey(seed.prompt);
    const existingPrompt =
      (seedId ? existingPromptsBySeedId.get(seedId) : null) ??
      existingPromptsByPrompt.get(promptKey);

    if (existingPrompt) {
      if (!normalizeSeedId(existingPrompt.websiteDerivedSeedId) && seedId) {
        const backfilledPrompt = await updateGeoPrompt(existingPrompt.id, {
          websiteDerivedSeedId: seed.websiteDerivedSeedId ?? null,
        });

        if (backfilledPrompt) {
          updatedPrompts.push(backfilledPrompt);
          existingPromptsByPrompt.set(promptKey, backfilledPrompt);
          existingPromptsBySeedId.set(seedId, backfilledPrompt);
        } else {
          skippedPromptCount += 1;
        }
        continue;
      }

      if (promptMatchesSeed(existingPrompt, seed)) {
        skippedPromptCount += 1;
        continue;
      }
      skippedPromptCount += 1;
      continue;
    }

    const createdPrompt = await createGeoPrompt(seed);
    createdPrompts.push(createdPrompt);
    existingPromptsByPrompt.set(promptKey, createdPrompt);
    if (seedId) {
      existingPromptsBySeedId.set(seedId, createdPrompt);
    }
  }

  return {
    createdPrompts,
    updatedPrompts,
    skippedPromptCount,
    totalSeedCount: GEO_WEBSITE_DERIVED_PROMPT_SEEDS.length,
  };
}
