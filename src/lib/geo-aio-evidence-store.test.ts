import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  createGeoAioEvidence,
  listGeoAioEvidence,
} from "./geo-aio-evidence-store";

const ORIGINAL_ENV = { ...process.env };
let tempDirectory = "";

beforeEach(async () => {
  tempDirectory = await mkdtemp(path.join(tmpdir(), "geo-aio-evidence-"));
  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_GEO_AIO_EVIDENCE_STORE_PATH: path.join(
      tempDirectory,
      "geo-aio-evidence.json",
    ),
  };
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("geo aio evidence store", () => {
  test("creates and lists Google AI Overviews manual evidence newest first", async () => {
    const firstEvidence = await createGeoAioEvidence({
      promptId: "prompt-1",
      promptTextSnapshot: "best IB reading workflow for parents",
      queryVariant: "best IB reading workflow for parents",
      aiOverviewStatus: "cited",
      citationUrls: ["https://dailysparks.geledtech.com/ib-parent-starter-kit"],
      dailySparksCited: true,
      observedAt: "2026-04-10T08:00:00.000Z",
      evidenceUrl: "https://search.google.com/search?q=best+IB+reading+workflow",
      screenshotUrl: "https://storage.example.com/aio-proof.png",
      notes: "AIO cited Daily Sparks starter kit.",
    });
    const secondEvidence = await createGeoAioEvidence({
      promptId: "prompt-2",
      promptTextSnapshot: "Goodnotes workflow for IB students",
      queryVariant: "Goodnotes workflow for IB students",
      aiOverviewStatus: "triggered-not-cited",
      citationUrls: [],
      dailySparksCited: false,
      observedAt: "2026-04-11T08:00:00.000Z",
      evidenceUrl: "",
      screenshotUrl: "",
      notes: "AIO appeared but did not cite Daily Sparks.",
    });

    const evidence = await listGeoAioEvidence();

    expect(firstEvidence.dailySparksCited).toBe(true);
    expect(secondEvidence.aiOverviewStatus).toBe("triggered-not-cited");
    expect(evidence.map((entry) => entry.id)).toEqual([
      secondEvidence.id,
      firstEvidence.id,
    ]);
  });
});
