import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { listGeoPrompts } from "./geo-prompt-store";
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
    expect(firstRun.skippedPromptCount).toBe(0);

    const secondRun = await seedWebsiteDerivedGeoPrompts();
    expect(secondRun.createdPrompts).toHaveLength(0);
    expect(secondRun.skippedPromptCount).toBe(firstRun.totalSeedCount);

    const prompts = await listGeoPrompts();
    expect(prompts).toHaveLength(firstRun.totalSeedCount);
  });
});
