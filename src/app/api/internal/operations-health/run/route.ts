import { after } from "next/server";

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

  after(async () => {
    try {
      await runOperationsHealthWorkflow({
        source: "scheduled",
      });
    } catch (error) {
      console.error("Background scheduled operations health run failed.", error);
    }
  });

  return Response.json({
    mode: "operations-health-async",
    message:
      "Scheduled operations health run queued. Check the dashboard shortly for the next immutable run.",
    queuedAt: new Date().toISOString(),
  }, { status: 202 });
}
