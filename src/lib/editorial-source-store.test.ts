import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  createEditorialSource,
  listEditorialSources,
  updateEditorialSource,
} from "./editorial-source-store";

const ORIGINAL_ENV = { ...process.env };
let tempDirectory = "";

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-editorial-source-store-"),
  );
  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_EDITORIAL_STORE_PATH: path.join(
      tempDirectory,
      "editorial-sources.json",
    ),
  };
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("editorial source store", () => {
  test("seeds the managed registry from the editorial whitelist foundation", async () => {
    const sources = await listEditorialSources();

    expect(sources).toHaveLength(10);
    expect(sources[0]).toMatchObject({
      id: "reuters",
      active: true,
      seededFromPolicy: true,
    });
    expect(sources.find((source) => source.id === "science-news-explores"))
      .toMatchObject({
        recommendedProgrammes: ["PYP"],
      });
    expect(sources.find((source) => source.id === "who")).toMatchObject({
      usageTiers: ["fact-check"],
      recommendedProgrammes: ["MYP", "DP"],
    });
  });

  test("creates and updates editorial sources in local mode", async () => {
    const created = await createEditorialSource({
      name: "The Conversation",
      domain: "theconversation.com",
      homepage: "https://theconversation.com/",
      roles: ["explainer"],
      usageTiers: ["background-context"],
      recommendedProgrammes: ["MYP", "DP"],
      sections: ["science", "education"],
      ingestionMode: "metadata-only",
      active: true,
      notes: "Academic explainers and commentary with strong context value.",
    });

    expect(created).toMatchObject({
      name: "The Conversation",
      domain: "theconversation.com",
      sections: ["science", "education"],
    });

    const updated = await updateEditorialSource(created.id, {
      active: false,
      sections: ["science", "politics"],
      notes: "Temporarily paused while we review education-tag coverage.",
    });

    expect(updated).toMatchObject({
      id: created.id,
      active: false,
      sections: ["science", "politics"],
    });

    const sources = await listEditorialSources();
    const saved = sources.find((source) => source.id === created.id);

    expect(saved).toMatchObject({
      active: false,
      notes: "Temporarily paused while we review education-tag coverage.",
    });
  });
});
