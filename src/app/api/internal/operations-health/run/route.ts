import {
  getDailyBriefSchedulerHeaderName,
  hasValidDailyBriefSchedulerSecret,
  isDailyBriefSchedulerConfigured,
} from "../../../../../lib/daily-brief-run-auth";
import { runOperationsHealthWorkflow } from "../../../../../lib/operations-health-runner";

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

  const result = await runOperationsHealthWorkflow({
    source: "scheduled",
  });

  return Response.json({
    mode: "operations-health",
    run: result.run,
    snapshot: result.snapshot,
    summary: {
      status: result.snapshot.status,
      alertCount: result.snapshot.alerts.length,
    },
  });
}
