import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  createOperationsHealthRun,
  listOperationsHealthRuns,
} from "./operations-health-run-store";

describe("operations health run store", () => {
  let tempDirectory: string;

  beforeEach(async () => {
    tempDirectory = await mkdtemp(
      path.join(tmpdir(), "daily-sparks-operations-health-"),
    );
    process.env.DAILY_SPARKS_PROFILE_STORE_BACKEND = "local";
    process.env.DAILY_SPARKS_OPERATIONS_HEALTH_RUN_STORE_PATH = path.join(
      tempDirectory,
      "operations-health-runs.json",
    );
  });

  afterEach(async () => {
    delete process.env.DAILY_SPARKS_OPERATIONS_HEALTH_RUN_STORE_PATH;
    await rm(tempDirectory, { recursive: true, force: true });
  });

  test("creates and lists immutable runs in reverse chronological order", async () => {
    await createOperationsHealthRun({
      id: "run-older",
      source: "scheduled",
      runDate: "2026-04-05",
      status: "warning",
      dailyBrief: {
        expectedProductionCount: 9,
        generatedCount: 9,
        approvedCount: 9,
        publishedCount: 7,
        failedCount: 1,
        missingProductionCount: 0,
        retryCandidateCount: 1,
        blockedCanaryCount: 0,
      },
      notifications: {
        queueCount: 1,
        pendingCount: 1,
        retryDueCount: 0,
        coolingDownCount: 0,
        escalatedCount: 0,
        dedupedCount: 0,
        under24hCount: 1,
        between24hAnd72hCount: 0,
        over72hCount: 0,
      },
      geo: {
        latestRunStatus: "completed",
        latestRunStartedAt: "2026-04-05T07:30:00.000Z",
        stale: false,
        timeoutCount: 0,
        activePromptCount: 8,
        createdLogCount: 24,
        failedCount: 0,
        machineReadabilityReadyCount: 4,
      },
      billing: {
        actionableCount: 1,
        sentTodayCount: 1,
        failedTodayCount: 0,
        dedupedTodayCount: 0,
        escalatedCount: 0,
      },
      alerts: [],
      remediationActions: [],
      startedAt: "2026-04-05T08:00:00.000Z",
      completedAt: "2026-04-05T08:01:00.000Z",
    });

    await createOperationsHealthRun({
      id: "run-newer",
      source: "manual",
      runDate: "2026-04-06",
      status: "healthy",
      dailyBrief: {
        expectedProductionCount: 9,
        generatedCount: 9,
        approvedCount: 9,
        publishedCount: 9,
        failedCount: 0,
        missingProductionCount: 0,
        retryCandidateCount: 0,
        blockedCanaryCount: 0,
      },
      notifications: {
        queueCount: 0,
        pendingCount: 0,
        retryDueCount: 0,
        coolingDownCount: 0,
        escalatedCount: 0,
        dedupedCount: 0,
        under24hCount: 0,
        between24hAnd72hCount: 0,
        over72hCount: 0,
      },
      geo: {
        latestRunStatus: "completed",
        latestRunStartedAt: "2026-04-06T07:30:00.000Z",
        stale: false,
        timeoutCount: 0,
        activePromptCount: 8,
        createdLogCount: 24,
        failedCount: 0,
        machineReadabilityReadyCount: 4,
      },
      billing: {
        actionableCount: 0,
        sentTodayCount: 0,
        failedTodayCount: 0,
        dedupedTodayCount: 0,
        escalatedCount: 0,
      },
      alerts: [],
      remediationActions: [],
      startedAt: "2026-04-06T08:00:00.000Z",
      completedAt: "2026-04-06T08:01:00.000Z",
    });

    const runs = await listOperationsHealthRuns();

    expect(runs.map((run) => run.id)).toEqual(["run-newer", "run-older"]);
    expect(runs[0]?.status).toBe("healthy");
    expect(runs[1]?.dailyBrief.retryCandidateCount).toBe(1);
  });
});
