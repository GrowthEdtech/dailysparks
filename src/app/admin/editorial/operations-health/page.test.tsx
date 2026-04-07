import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  listOperationsHealthRunsMock,
  listDailyBriefHistoryMock,
  listParentProfilesMock,
  listPlannedNotificationRunHistoryMock,
  listGeoMonitoringRunsMock,
  getDailyBriefBusinessDateMock,
  buildPlannedNotificationOpsQueueMock,
} = vi.hoisted(() => ({
  listOperationsHealthRunsMock: vi.fn(),
  listDailyBriefHistoryMock: vi.fn(),
  listParentProfilesMock: vi.fn(),
  listPlannedNotificationRunHistoryMock: vi.fn(),
  listGeoMonitoringRunsMock: vi.fn(),
  getDailyBriefBusinessDateMock: vi.fn(),
  buildPlannedNotificationOpsQueueMock: vi.fn(),
}));

vi.mock("../../../../lib/operations-health-run-store", () => ({
  listOperationsHealthRuns: listOperationsHealthRunsMock,
}));

vi.mock("../../../../lib/daily-brief-history-store", () => ({
  listDailyBriefHistory: listDailyBriefHistoryMock,
}));

vi.mock("../../../../lib/mvp-store", () => ({
  listParentProfiles: listParentProfilesMock,
}));

vi.mock("../../../../lib/planned-notification-history-store", () => ({
  listPlannedNotificationRunHistory: listPlannedNotificationRunHistoryMock,
}));

vi.mock("../../../../lib/geo-monitoring-run-store", () => ({
  listGeoMonitoringRuns: listGeoMonitoringRunsMock,
}));

vi.mock("../../../../lib/daily-brief-run-date", () => ({
  getDailyBriefBusinessDate: getDailyBriefBusinessDateMock,
}));

vi.mock("../../../../lib/planned-notification-ops", () => ({
  buildPlannedNotificationOpsQueue: buildPlannedNotificationOpsQueueMock,
}));

import OperationsHealthAdminPage from "./page";

describe("OperationsHealthAdminPage", () => {
  beforeEach(() => {
    listOperationsHealthRunsMock.mockReset();
    listDailyBriefHistoryMock.mockReset();
    listParentProfilesMock.mockReset();
    listPlannedNotificationRunHistoryMock.mockReset();
    listGeoMonitoringRunsMock.mockReset();
    getDailyBriefBusinessDateMock.mockReset();
    buildPlannedNotificationOpsQueueMock.mockReset();
  });

  test("renders the operations health dashboard and recent evidence", async () => {
    getDailyBriefBusinessDateMock.mockReturnValue("2026-04-06");
    listOperationsHealthRunsMock.mockResolvedValue([
      {
        id: "run-1",
        source: "scheduled",
        runDate: "2026-04-06",
        status: "warning",
        dailyBrief: {
          expectedProductionCount: 9,
          generatedCount: 9,
          approvedCount: 9,
          publishedCount: 8,
          failedCount: 0,
          missingProductionCount: 0,
          retryCandidateCount: 1,
          blockedCanaryCount: 1,
        },
        notifications: {
          queueCount: 2,
          pendingCount: 1,
          retryDueCount: 0,
          coolingDownCount: 0,
          escalatedCount: 1,
          dedupedCount: 0,
          under24hCount: 1,
          between24hAnd72hCount: 0,
          over72hCount: 1,
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
          actionableCount: 1,
          sentTodayCount: 1,
          failedTodayCount: 0,
          dedupedTodayCount: 0,
          escalatedCount: 1,
        },
        alerts: [
          {
            area: "planned-notifications",
            severity: "critical",
            title: "Notifications require manual intervention",
            detail: "1 item needs follow-up.",
            metricValue: 1,
            webhookDelivered: false,
            webhookUsed: false,
            emailDelivered: true,
            emailUsed: true,
            emailRecipient: "admin@geledtech.com",
            emailMessageId: "ops-alert-message-id",
          },
        ],
        remediationActions: [
          {
            action: "blocked-canary-review",
            status: "executed",
            detail: "Blocked production waves were held for operator release or manual canary rerun.",
            startedAt: "2026-04-06T08:00:00.000Z",
            completedAt: "2026-04-06T08:01:00.000Z",
          },
          {
            action: "retry-delivery",
            status: "executed",
            detail: "Executed successfully.",
            startedAt: "2026-04-06T08:00:00.000Z",
            completedAt: "2026-04-06T08:01:00.000Z",
          },
        ],
        startedAt: "2026-04-06T08:00:00.000Z",
        completedAt: "2026-04-06T08:01:00.000Z",
      },
    ]);
    listDailyBriefHistoryMock.mockResolvedValue([]);
    listParentProfilesMock.mockResolvedValue([]);
    listPlannedNotificationRunHistoryMock.mockResolvedValue([]);
    listGeoMonitoringRunsMock.mockResolvedValue([]);
    buildPlannedNotificationOpsQueueMock.mockReturnValue({
      summary: {
        totalCount: 0,
        pendingCount: 0,
        retryDueCount: 0,
        coolingDownCount: 0,
        escalatedCount: 0,
        dedupedCount: 0,
        under24hCount: 0,
        between24hAnd72hCount: 0,
        over72hCount: 0,
      },
      items: [],
    });

    const markup = renderToStaticMarkup(await OperationsHealthAdminPage());

    expect(markup).toContain("Operations health");
    expect(markup).toContain("Alerting / SLA policy");
    expect(markup).toContain("Auto-remediation workflows");
    expect(markup).toContain("Run health check now");
    expect(markup).toContain("Notifications require manual intervention");
    expect(markup).toContain("retry-delivery");
    expect(markup).toContain("admin@geledtech.com");
  });
});
