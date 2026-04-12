import { listDailyBriefHistory } from "./daily-brief-history-store";
import { getDailyBriefBusinessDate } from "./daily-brief-run-date";
import { listGeoMonitoringRuns } from "./geo-monitoring-run-store";
import { listParentProfiles } from "./mvp-store";
import { buildOperationsHealthSnapshot } from "./operations-health";
import { listOperationsHealthRuns } from "./operations-health-run-store";
import { listPlannedNotificationRunHistory } from "./planned-notification-history-store";
import { buildPlannedNotificationOpsQueue } from "./planned-notification-ops";

export async function readOperationsHealthDashboardData(input?: { now?: Date }) {
  const now = input?.now ?? new Date();
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
    profiles,
    dailyBriefHistory,
    plannedNotificationQueue,
    plannedNotificationHistory,
    geoRuns,
  });

  return { snapshot, runs };
}
