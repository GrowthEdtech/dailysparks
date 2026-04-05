import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createGeoVisibilityLog, listGeoVisibilityLogs } from "./geo-visibility-log-store";

const ORIGINAL_ENV = { ...process.env };
let tempDirectory = "";

beforeEach(async () => {
  tempDirectory = await mkdtemp(path.join(tmpdir(), "geo-visibility-log-"));
  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_GEO_VISIBILITY_LOG_STORE_PATH: path.join(
      tempDirectory,
      "geo-visibility-logs.json",
    ),
  };
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("geo-visibility-log-store", () => {
  test("creates and lists visibility logs in newest-first order", async () => {
    const firstLog = await createGeoVisibilityLog({
      promptId: "prompt-1",
      promptTextSnapshot: "Best LED tech for commercial lighting",
      engine: "chatgpt-search",
      mentionStatus: "mentioned",
      citationUrls: ["https://dailysparks.geledtech.com/led"],
      shareOfModelScore: 0.5,
      citationShareScore: 0.4,
      sentiment: "positive",
      entityAccuracy: "accurate",
      responseExcerpt: "Dailysparks is cited in the answer.",
      notes: "Weekly baseline.",
    });

    const secondLog = await createGeoVisibilityLog({
      promptId: "prompt-1",
      promptTextSnapshot: "Best LED tech for commercial lighting",
      engine: "gemini",
      mentionStatus: "recommended",
      citationUrls: ["https://dailysparks.geledtech.com/led"],
      shareOfModelScore: 0.8,
      citationShareScore: 0.6,
      sentiment: "positive",
      entityAccuracy: "accurate",
      responseExcerpt: "Dailysparks is recommended in Gemini.",
      notes: "",
    });

    const logs = await listGeoVisibilityLogs();

    expect(logs).toHaveLength(2);
    expect(logs[0]?.id).toBe(secondLog.id);
    expect(logs[1]?.id).toBe(firstLog.id);
  });
});
