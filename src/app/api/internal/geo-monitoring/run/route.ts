import { after } from "next/server";

import {
  getDailyBriefSchedulerHeaderName,
  hasValidDailyBriefSchedulerSecret,
  isDailyBriefSchedulerConfigured,
} from "../../../../../lib/daily-brief-run-auth";
import { runGeoMonitoring } from "../../../../../lib/geo-monitoring";
import {
  createGeoMonitoringRun,
  updateGeoMonitoringRun,
} from "../../../../../lib/geo-monitoring-run-store";

function serviceUnavailable(message: string) {
  return Response.json({ message }, { status: 503 });
}

function unauthorized(message: string) {
  return Response.json({ message }, { status: 401 });
}

export async function POST(request: Request) {
  if (!isDailyBriefSchedulerConfigured()) {
    return serviceUnavailable(
      `Daily brief scheduler is not configured yet. Set ${getDailyBriefSchedulerHeaderName()} support first.`,
    );
  }

  if (!hasValidDailyBriefSchedulerSecret(request)) {
    return unauthorized(
      "Please provide the daily brief scheduler secret to run this route.",
    );
  }

  const now = new Date().toISOString();
  const queuedRun = await createGeoMonitoringRun({
    source: "scheduled",
    status: "running",
    activePromptCount: 0,
    expandedQueryCount: 0,
    engineAttemptCount: 0,
    createdLogCount: 0,
    skippedCount: 0,
    failedCount: 0,
    machineReadabilityReadyCount: 0,
    notes: "Scheduled GEO monitoring job started from the internal scheduler.",
    startedAt: now,
    completedAt: now,
    engineBreakdown: [],
    queryDiagnostics: [],
  });

  after(async () => {
    try {
      await runGeoMonitoring({
        source: "scheduled",
        runId: queuedRun.id,
        persistMode: "update",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Background GEO monitoring job failed.";

      await updateGeoMonitoringRun(queuedRun.id, {
        status: "failed",
        failedCount: 1,
        notes: `Background GEO monitoring job failed: ${message}`,
        completedAt: new Date().toISOString(),
      });
    }
  });

  return Response.json(
    {
      mode: "geo-monitoring-async",
      run: queuedRun,
      logs: [],
      machineReadabilityStatus: null,
      summary: {
        logCreatedCount: 0,
        machineReadabilityReadyCount: queuedRun.machineReadabilityReadyCount,
        runStatus: queuedRun.status,
      },
    },
    { status: 202 },
  );
}
