import {
  getDailyBriefSchedulerHeaderName,
  hasValidDailyBriefSchedulerSecret,
  isDailyBriefSchedulerConfigured,
} from "../../../../../lib/daily-brief-run-auth";
import { reconcileBillingBackfillForProfiles } from "../../../../../lib/growth-billing-reconciliation";
import { listParentProfiles } from "../../../../../lib/mvp-store";
import { getGrowthReconciliationSummary } from "../../../../../lib/growth-reconciliation";
import { runGrowthNotificationEmails } from "../../../../../lib/growth-notification-runner";

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

  const profiles = await listParentProfiles();
  const billingBackfill = await reconcileBillingBackfillForProfiles({ profiles });
  const hydratedProfiles = billingBackfill.profiles;
  const now = new Date();
  const summary = getGrowthReconciliationSummary(hydratedProfiles, now);
  const notificationRun = await runGrowthNotificationEmails({
    profiles: hydratedProfiles,
    now,
  });

  return Response.json({
    mode: "growth-reconciliation",
    runDate: summary.runDate,
    billingBackfill: {
      checkedCount: billingBackfill.checkedCount,
      backfilledCount: billingBackfill.backfilledCount,
      skippedCount: billingBackfill.skippedCount,
      failedCount: billingBackfill.failedCount,
    },
    summary,
    notificationRun,
  });
}
