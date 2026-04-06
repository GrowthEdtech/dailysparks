import {
  getDailyBriefSchedulerHeaderName,
  hasValidDailyBriefSchedulerSecret,
  isDailyBriefSchedulerConfigured,
} from "../../../../../lib/daily-brief-run-auth";
import { runGeoMonitoring } from "../../../../../lib/geo-monitoring";

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

  const result = await runGeoMonitoring({ source: "scheduled" });

  return Response.json({
    mode: "geo-monitoring",
    run: result.run,
    machineReadabilityStatus: result.machineReadabilityStatus,
    summary: {
      logCreatedCount: result.logs.length,
      machineReadabilityReadyCount: result.run.machineReadabilityReadyCount,
      runStatus: result.run.status,
    },
  });
}
