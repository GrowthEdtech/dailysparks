import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  getGeoMachineReadabilityStatus,
  updateGeoMachineReadabilityStatus,
} from "./geo-machine-readability-store";

const ORIGINAL_ENV = { ...process.env };
let tempDirectory = "";

beforeEach(async () => {
  tempDirectory = await mkdtemp(path.join(tmpdir(), "geo-machine-readability-"));
  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_GEO_MACHINE_READABILITY_STORE_PATH: path.join(
      tempDirectory,
      "geo-machine-readability.json",
    ),
  };
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("geo-machine-readability-store", () => {
  test("returns defaults and persists updates", async () => {
    const initialStatus = await getGeoMachineReadabilityStatus();

    expect(initialStatus.llmsTxtStatus).toBe("not-configured");
    expect(initialStatus.ssrStatus).toBe("needs-attention");

    const updatedStatus = await updateGeoMachineReadabilityStatus({
      llmsTxtStatus: "ready",
      llmsFullTxtStatus: "ready",
      ssrStatus: "ready",
      jsonLdStatus: "needs-attention",
      notes: "llms.txt and SSR verified in staging.",
      lastCheckedAt: "2026-04-06T09:00:00.000Z",
    });

    expect(updatedStatus.llmsTxtStatus).toBe("ready");
    expect(updatedStatus.notes).toContain("verified");
  });
});
