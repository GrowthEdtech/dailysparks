import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  createGeoMonitoringRun,
  listGeoMonitoringRuns,
  updateGeoMonitoringRun,
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
    expect(runs[0]?.rankabilityScore).toBe(0);
    expect(runs[0]?.citationReadinessScore).toBe(0);
    expect(runs[0]?.biasResistanceScore).toBe(0);
    expect(runs[0]?.queryDiagnostics).toEqual([]);
    expect(runs[0]?.engineBreakdown[0]?.engine).toBe("chatgpt-search");
  });

  test("updates a queued run with query-level diagnostics", async () => {
    const run = await createGeoMonitoringRun({
      id: "geo-run-async-1",
      source: "manual",
      status: "running",
      activePromptCount: 0,
      expandedQueryCount: 0,
      engineAttemptCount: 0,
      createdLogCount: 0,
      skippedCount: 0,
      failedCount: 0,
      machineReadabilityReadyCount: 0,
      notes: "Manual GEO monitoring job queued.",
      startedAt: "2026-04-11T01:00:00.000Z",
      completedAt: "2026-04-11T01:00:00.000Z",
      engineBreakdown: [],
      queryDiagnostics: [],
    });

    const updatedRun = await updateGeoMonitoringRun(run.id, {
      status: "partial",
      activePromptCount: 1,
      expandedQueryCount: 2,
      engineAttemptCount: 2,
      createdLogCount: 1,
      failedCount: 1,
      notes: "One query timed out.",
      completedAt: "2026-04-11T01:01:00.000Z",
      queryDiagnostics: [
        {
          promptId: "prompt-1",
          promptIntentLabel: "IB workflow comparison",
          queryVariant: "best IB reading workflow for parents",
          engine: "chatgpt-search",
          outcome: "success",
          mentionStatus: "recommended",
          sentiment: "positive",
          citationUrlCount: 1,
          durationMs: 1200,
          reason: "Created visibility log.",
          logId: "log-1",
        },
        {
          promptId: "prompt-1",
          promptIntentLabel: "IB workflow comparison",
          queryVariant: "Daily Sparks vs tutoring",
          engine: "chatgpt-search",
          outcome: "failed",
          mentionStatus: null,
          sentiment: null,
          citationUrlCount: 0,
          durationMs: 15000,
          reason: "chatgpt-search monitoring check timed out after 15000ms.",
          logId: null,
        },
      ],
    });

    expect(updatedRun.status).toBe("partial");
    expect(updatedRun.queryDiagnostics).toHaveLength(2);
    expect(updatedRun.queryDiagnostics[0]?.logId).toBe("log-1");
    expect(updatedRun.queryDiagnostics[1]?.outcome).toBe("failed");

    const runs = await listGeoMonitoringRuns();

    expect(runs).toHaveLength(1);
    expect(runs[0]?.id).toBe("geo-run-async-1");
    expect(runs[0]?.queryDiagnostics[1]?.durationMs).toBe(15000);
  });
});
