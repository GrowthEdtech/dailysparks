import { describe, expect, test } from "vitest";

import type { OperationsHealthSnapshot } from "../../../../lib/operations-health";
import type { OperationsHealthRunRecord } from "../../../../lib/operations-health-run-schema";
import { buildOperationsHealthHandoffSummary } from "./operations-health-handoff";

describe("buildOperationsHealthHandoffSummary", () => {
  test("builds a compact operator handoff from the current snapshot and latest run", () => {
    const snapshot: OperationsHealthSnapshot = {
      runDate: "2026-04-07",
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
        latestRunStartedAt: "2026-04-07T07:30:00.000Z",
        stale: false,
        timeoutCount: 1,
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
          area: "daily-brief",
          severity: "critical",
          title: "Production briefs are blocked by synthetic canary",
          detail: "1 production brief is currently held.",
          metricValue: 1,
        },
        {
          area: "planned-notifications",
          severity: "warning",
          title: "Notification queue has SLA breaches",
          detail: "1 unresolved item is older than 72 hours.",
          metricValue: 1,
        },
      ],
    };

    const latestRun: OperationsHealthRunRecord = {
      id: "run-1",
      source: "scheduled",
      runDate: "2026-04-07",
      status: "warning",
      dailyBrief: snapshot.dailyBrief,
      notifications: snapshot.notifications,
      geo: snapshot.geo,
      billing: snapshot.billing,
      alerts: snapshot.alerts,
      remediationActions: [
        {
          action: "blocked-canary-review",
          status: "executed",
          detail:
            "Blocked production waves were held for operator release or manual canary rerun.",
          startedAt: "2026-04-07T08:00:00.000Z",
          completedAt: "2026-04-07T08:01:00.000Z",
        },
        {
          action: "retry-delivery",
          status: "executed",
          detail: "Executed successfully.",
          startedAt: "2026-04-07T08:05:00.000Z",
          completedAt: "2026-04-07T08:06:00.000Z",
        },
      ],
      startedAt: "2026-04-07T08:00:00.000Z",
      completedAt: "2026-04-07T08:06:00.000Z",
    };

    const summary = buildOperationsHealthHandoffSummary({
      snapshot,
      latestRun,
    });

    expect(summary).toContain("# Operations Health Shift Handoff");
    expect(summary).toContain("- Run date: 2026-04-07");
    expect(summary).toContain("- Status: warning");
    expect(summary).toContain("- Daily Brief: 9/9 generated, 1 retry candidate, 1 blocked by canary");
    expect(summary).toContain("- Alerts: 2 active");
    expect(summary).toContain("- Notifications: 1 escalated, 1 older than 72h");
    expect(summary).toContain("- Billing: 1 actionable item");
    expect(summary).toContain("- GEO: completed, 8 active prompts, 1 timeout");
    expect(summary).toContain("Production briefs are blocked by synthetic canary");
    expect(summary).toContain("blocked-canary-review (executed)");
    expect(summary).toContain("Recommended handoff note");
    expect(summary).toContain("Blocked canary is active");
  });
});
