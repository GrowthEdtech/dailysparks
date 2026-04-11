import { after } from "next/server";

import {
  clearEditorialAdminSessionCookieHeader,
  getEditorialAdminSessionFromRequest,
} from "../../../../../lib/editorial-admin-auth";
import { runGeoMonitoring } from "../../../../../lib/geo-monitoring";
import {
  createGeoMonitoringRun,
  updateGeoMonitoringRun,
} from "../../../../../lib/geo-monitoring-run-store";

function unauthorized(message: string) {
  return Response.json(
    { message },
    {
      status: 401,
      headers: {
        "Set-Cookie": clearEditorialAdminSessionCookieHeader(),
      },
    },
  );
}

async function requireAdminSession(request: Request) {
  const session = await getEditorialAdminSessionFromRequest(request);

  if (!session) {
    return {
      errorResponse: unauthorized("Please log in to the editorial admin."),
      session: null,
    };
  }

  return {
    errorResponse: null,
    session,
  };
}

export async function POST(request: Request) {
  const adminCheck = await requireAdminSession(request);

  if (adminCheck.errorResponse) {
    return adminCheck.errorResponse;
  }

  const now = new Date().toISOString();
  const queuedRun = await createGeoMonitoringRun({
    source: "manual",
    status: "running",
    activePromptCount: 0,
    expandedQueryCount: 0,
    engineAttemptCount: 0,
    createdLogCount: 0,
    skippedCount: 0,
    failedCount: 0,
    machineReadabilityReadyCount: 0,
    notes: "Manual GEO monitoring job started from the admin workspace.",
    startedAt: now,
    completedAt: now,
    engineBreakdown: [],
    queryDiagnostics: [],
  });

  after(async () => {
    try {
      await runGeoMonitoring({
        source: "manual",
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
