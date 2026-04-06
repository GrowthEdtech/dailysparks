import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { listGeoPrompts, updateGeoPrompt } from "./geo-prompt-store";
import { seedWebsiteDerivedGeoPrompts } from "./geo-prompt-seeding";

const ORIGINAL_ENV = { ...process.env };
let tempDirectory = "";

beforeEach(async () => {
  tempDirectory = await mkdtemp(path.join(tmpdir(), "geo-prompt-seeding-"));
  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_GEO_PROMPT_STORE_PATH: path.join(tempDirectory, "geo-prompts.json"),
  };
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("geo-prompt-seeding", () => {
  test("seeds website-derived prompts once and skips duplicates on the second pass", async () => {
    const firstRun = await seedWebsiteDerivedGeoPrompts();
    expect(firstRun.createdPrompts.length).toBeGreaterThan(0);
    expect(firstRun.updatedPrompts).toHaveLength(0);
    expect(firstRun.skippedPromptCount).toBe(0);

    const secondRun = await seedWebsiteDerivedGeoPrompts();
    expect(secondRun.createdPrompts).toHaveLength(0);
    expect(secondRun.updatedPrompts).toHaveLength(0);
    expect(secondRun.skippedPromptCount).toBe(firstRun.totalSeedCount);

    const prompts = await listGeoPrompts();
    expect(prompts).toHaveLength(firstRun.totalSeedCount);
  });

  test("syncs existing starter prompts to the latest website-derived seed definition", async () => {
    const firstRun = await seedWebsiteDerivedGeoPrompts();
    const promptToDrift = firstRun.createdPrompts[0];

    if (!promptToDrift) {
      throw new Error("Expected a starter prompt to exist.");
    }

    await updateGeoPrompt(promptToDrift.id, {
      engineCoverage: ["chatgpt-search", "gemini"],
      notes: "Drifted notes",
    });

    const secondRun = await seedWebsiteDerivedGeoPrompts();
    expect(secondRun.createdPrompts).toHaveLength(0);
    expect(secondRun.updatedPrompts.length).toBeGreaterThanOrEqual(1);

    const prompts = await listGeoPrompts();
    const syncedPrompt = prompts.find((prompt) => prompt.id === promptToDrift.id);
    expect(syncedPrompt?.engineCoverage).toEqual(["chatgpt-search"]);
    expect(syncedPrompt?.notes).not.toBe("Drifted notes");
  });
});
