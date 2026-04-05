import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createGeoPrompt, listGeoPrompts, updateGeoPrompt } from "./geo-prompt-store";

const ORIGINAL_ENV = { ...process.env };
let tempDirectory = "";

beforeEach(async () => {
  tempDirectory = await mkdtemp(path.join(tmpdir(), "geo-prompt-store-"));
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

describe("geo-prompt-store", () => {
  test("creates, lists, and updates GEO prompts", async () => {
    const createdPrompt = await createGeoPrompt({
      prompt: "Best LED tech for commercial lighting",
      intentLabel: "Commercial comparison",
      priority: "high",
      targetProgrammes: ["MYP", "DP"],
      engineCoverage: ["chatgpt-search", "gemini"],
      fanOutHints: ["Asian led suppliers", "commercial lighting guide"],
      active: true,
      notes: "Core overseas buying prompt.",
    });

    expect(createdPrompt.prompt).toContain("commercial lighting");

    const listedPrompts = await listGeoPrompts();

    expect(listedPrompts).toHaveLength(1);
    expect(listedPrompts[0]?.intentLabel).toBe("Commercial comparison");

    const updatedPrompt = await updateGeoPrompt(createdPrompt.id, {
      active: false,
      notes: "Paused during prompt review.",
    });

    expect(updatedPrompt?.active).toBe(false);
    expect(updatedPrompt?.notes).toBe("Paused during prompt review.");
  });
});
