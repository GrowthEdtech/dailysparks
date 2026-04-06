import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  createGeoMonitoringRun,
  listGeoMonitoringRuns,
} from "./geo-monitoring-run-store";

const ORIGINAL_ENV = { ...process.env };
let tempDirectory = "";

beforeEach(async () => {
  tempDirectory = await mkdtemp(path.join(tmpdir(), "geo-monitoring-runs-"));
  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_GEO_MONITORING_RUN_STORE_PATH: path.join(
      tempDirectory,
      "geo-monitoring-runs.json",
    ),
  };
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("geo-monitoring-run-store", () => {
  test("creates and lists GEO monitoring runs", async () => {
    const run = await createGeoMonitoringRun({
      source: "scheduled",
      status: "completed",
      activePromptCount: 2,
      expandedQueryCount: 4,
      engineAttemptCount: 8,
      createdLogCount: 5,
      skippedCount: 2,
      failedCount: 1,
      machineReadabilityReadyCount: 3,
      notes: "Daily GEO scan finished with one skipped engine.",
      startedAt: "2026-04-06T08:15:00.000Z",
      completedAt: "2026-04-06T08:17:00.000Z",
      engineBreakdown: [
        {
          engine: "chatgpt-search",
          attemptedCount: 4,
          createdLogCount: 4,
          skippedCount: 0,
          failedCount: 0,
        },
      ],
    });

    expect(run.status).toBe("completed");

    const runs = await listGeoMonitoringRuns();

    expect(runs).toHaveLength(1);
    expect(runs[0]?.id).toBe(run.id);
    expect(runs[0]?.engineBreakdown[0]?.engine).toBe("chatgpt-search");
  });
});
