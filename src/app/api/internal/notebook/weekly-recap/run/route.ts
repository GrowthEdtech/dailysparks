import {
  getDailyBriefSchedulerHeaderName,
  hasValidDailyBriefSchedulerSecret,
  isDailyBriefSchedulerConfigured,
} from "../../../../../../lib/daily-brief-run-auth";
import {
  runScheduledNotebookWeeklyRecapDelivery,
} from "../../../../../../lib/daily-brief-notebook-weekly-recap-delivery";

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

  const summary = await runScheduledNotebookWeeklyRecapDelivery();

  return Response.json({
    mode: "weekly-recap-delivery",
    summary,
  });
}
