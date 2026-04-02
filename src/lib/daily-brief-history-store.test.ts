import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  createDailyBriefHistoryEntry,
  getDailyBriefHistoryEntry,
  listDailyBriefHistory,
} from "./daily-brief-history-store";

const ORIGINAL_ENV = { ...process.env };

function buildBriefInput(overrides: Partial<Parameters<typeof createDailyBriefHistoryEntry>[0]> = {}) {
  return {
    scheduledFor: "2026-04-02",
    headline: "Students debate how cities should respond to rising heat.",
    summary:
      "A family-friendly brief about how cities, schools, and communities respond to heat waves.",
    programme: "MYP" as const,
    status: "draft" as const,
    topicTags: ["climate", "cities"],
    sourceReferences: [
      {
        sourceId: "reuters",
        sourceName: "Reuters",
        sourceDomain: "reuters.com",
        articleTitle: "Cities test new heat protections",
        articleUrl: "https://www.reuters.com/world/example-heat-story",
      },
    ],
    aiConnectionId: "nf-relay",
    aiConnectionName: "NF Relay",
    aiModel: "gpt-5.4",
    promptVersion: "v1.0.0",
    repetitionRisk: "low" as const,
    repetitionNotes: "No similar climate-city brief in the past 14 days.",
    adminNotes: "Strong family discussion potential.",
    briefMarkdown:
      "## Today\nCities are testing how to keep schools and public spaces safe during extreme heat.",
    ...overrides,
  };
}

let tempDirectory = "";

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-daily-brief-history-"),
  );

  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_DAILY_BRIEF_STORE_PATH: path.join(
      tempDirectory,
      "daily-brief-history.json",
    ),
  };
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("daily brief history store", () => {
  test("returns an empty list before any daily briefs are recorded", async () => {
    expect(await listDailyBriefHistory()).toEqual([]);
  });

  test("creates, sorts, and fetches history entries", async () => {
    const olderEntry = await createDailyBriefHistoryEntry(
      buildBriefInput({
        scheduledFor: "2026-04-01",
        headline: "An earlier brief",
      }),
    );
    const newerEntry = await createDailyBriefHistoryEntry(
      buildBriefInput({
        scheduledFor: "2026-04-02",
        headline: "A later brief",
        status: "published",
      }),
    );

    const history = await listDailyBriefHistory();
    const fetchedEntry = await getDailyBriefHistoryEntry(newerEntry.id);

    expect(history).toHaveLength(2);
    expect(history[0]?.id).toBe(newerEntry.id);
    expect(history[1]?.id).toBe(olderEntry.id);
    expect(fetchedEntry?.headline).toBe("A later brief");
    expect(fetchedEntry?.sourceReferences[0]?.sourceName).toBe("Reuters");
  });
});
