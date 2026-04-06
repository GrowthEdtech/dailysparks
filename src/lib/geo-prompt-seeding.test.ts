import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createGeoPrompt, listGeoPrompts, updateGeoPrompt } from "./geo-prompt-store";
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

  test("preserves manual edits on existing seeded starter prompts without overwriting them", async () => {
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
    expect(secondRun.updatedPrompts).toHaveLength(0);

    const prompts = await listGeoPrompts();
    const syncedPrompt = prompts.find((prompt) => prompt.id === promptToDrift.id);
    expect(syncedPrompt?.engineCoverage).toEqual(["chatgpt-search", "gemini"]);
    expect(syncedPrompt?.notes).toBe("Drifted notes");
    expect(syncedPrompt?.websiteDerivedSeedId).toBeTruthy();
  });

  test("backfills a stable seed id onto legacy starter prompts matched by exact prompt text", async () => {
    const legacyPrompt = await createGeoPrompt({
      prompt: "IB reading workflow for families",
      intentLabel: "IB family workflow",
      priority: "high",
      targetProgrammes: ["PYP", "MYP", "DP"],
      engineCoverage: ["chatgpt-search", "gemini"],
      fanOutHints: ["IB family reading routine"],
      active: true,
      notes: "Legacy starter prompt edited by ops.",
    });

    const run = await seedWebsiteDerivedGeoPrompts();
    const prompts = await listGeoPrompts();
    const updatedLegacyPrompt = prompts.find((prompt) => prompt.id === legacyPrompt.id);

    expect(run.createdPrompts.length).toBe(
      run.totalSeedCount - 1,
    );
    expect(run.updatedPrompts).toContainEqual(
      expect.objectContaining({
        id: legacyPrompt.id,
      }),
    );
    expect(updatedLegacyPrompt).toMatchObject({
      websiteDerivedSeedId: expect.stringContaining("website-derived:"),
      engineCoverage: ["chatgpt-search", "gemini"],
      notes: "Legacy starter prompt edited by ops.",
    });
  });

  test("does not match or overwrite a manually created prompt that only shares the same intent label", async () => {
    await createGeoPrompt({
      prompt: "Custom IB reading workflow for boarding families",
      intentLabel: "IB family workflow",
      priority: "watch",
      targetProgrammes: ["DP"],
      engineCoverage: ["chatgpt-search"],
      fanOutHints: ["boarding school reading workflow"],
      active: true,
      notes: "Manual GEO prompt.",
    });

    const run = await seedWebsiteDerivedGeoPrompts();
    const prompts = await listGeoPrompts();

    expect(run.createdPrompts.length).toBeGreaterThan(0);
    expect(
      prompts.find(
        (prompt) =>
          prompt.prompt === "Custom IB reading workflow for boarding families",
      ),
    ).toMatchObject({
      intentLabel: "IB family workflow",
      websiteDerivedSeedId: null,
      notes: "Manual GEO prompt.",
    });
    expect(
      prompts.find((prompt) => prompt.prompt === "IB reading workflow for families"),
    ).toMatchObject({
      websiteDerivedSeedId: expect.stringContaining("website-derived:"),
    });
  });
});
