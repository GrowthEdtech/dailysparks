import { listDailyBriefHistory } from "../../../../lib/daily-brief-history-store";
import { getDailyBriefBusinessDate } from "../../../../lib/daily-brief-run-date";
import { listGeoMonitoringRuns } from "../../../../lib/geo-monitoring-run-store";
import { listParentProfiles } from "../../../../lib/mvp-store";
import { buildOperationsHealthSnapshot } from "../../../../lib/operations-health";
import { listOperationsHealthRuns } from "../../../../lib/operations-health-run-store";
import { listPlannedNotificationRunHistory } from "../../../../lib/planned-notification-history-store";
import { buildPlannedNotificationOpsQueue } from "../../../../lib/planned-notification-ops";
import OperationsHealthPanel from "./operations-health-panel";

export default async function OperationsHealthAdminPage() {
  const now = new Date();
  const runDate = getDailyBriefBusinessDate(now);
  const [runs, dailyBriefHistory, profiles, plannedNotificationHistory, geoRuns] =
    await Promise.all([
      listOperationsHealthRuns(),
      listDailyBriefHistory({
        scheduledFor: runDate,
        recordKind: "production",
      }),
      listParentProfiles(),
      listPlannedNotificationRunHistory(),
      listGeoMonitoringRuns(),
    ]);

  const plannedNotificationQueue = buildPlannedNotificationOpsQueue({
    profiles,
    history: plannedNotificationHistory,
    now,
  });

  const snapshot = buildOperationsHealthSnapshot({
    runDate,
    now,
    dailyBriefHistory,
    plannedNotificationQueue,
    plannedNotificationHistory,
    geoRuns,
  });

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      <OperationsHealthPanel initialSnapshot={snapshot} initialRuns={runs} />
    </section>
  );
}
