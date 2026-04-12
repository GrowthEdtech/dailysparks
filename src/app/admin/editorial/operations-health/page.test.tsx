import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

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

const ORIGINAL_ENV = { ...process.env };

function buildProfile(
  email: string,
  deliveryStatus: "success" | "failed",
) {
  return {
    parent: {
      id: `${email}-parent`,
      email,
      fullName: "Parent",
      countryCode: "HK",
      deliveryTimeZone: "Asia/Hong_Kong",
      preferredDeliveryLocalTime: "09:00",
      onboardingReminderCount: 0,
      onboardingReminderLastAttemptAt: null,
      onboardingReminderLastSentAt: null,
      onboardingReminderLastStage: null,
      onboardingReminderLastStatus: null,
      onboardingReminderLastMessageId: null,
      onboardingReminderLastError: null,
      subscriptionStatus: "active",
      subscriptionPlan: "yearly",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      trialStartedAt: "2026-04-01T00:00:00.000Z",
      trialEndsAt: "2026-04-30T00:00:00.000Z",
      subscriptionActivatedAt: "2026-04-01T00:00:00.000Z",
      subscriptionRenewalAt: null,
      latestInvoiceId: null,
      latestInvoiceNumber: null,
      latestInvoiceStatus: null,
      latestInvoiceHostedUrl: null,
      latestInvoicePdfUrl: null,
      latestInvoiceAmountPaid: null,
      latestInvoiceCurrency: null,
      latestInvoicePaidAt: null,
      latestInvoicePeriodStart: null,
      latestInvoicePeriodEnd: null,
      notionWorkspaceId: null,
      notionWorkspaceName: null,
      notionBotId: null,
      notionDatabaseId: null,
      notionDatabaseName: null,
      notionDataSourceId: null,
      notionAuthorizedAt: null,
      notionLastSyncedAt: null,
      notionLastSyncStatus: null,
      notionLastSyncMessage: null,
      notionLastSyncPageId: null,
      notionLastSyncPageUrl: null,
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
    },
    student: {
      id: `${email}-student`,
      parentId: `${email}-parent`,
      studentName: "Student",
      programme: "PYP",
      programmeYear: 5,
      goodnotesEmail: `${email}.goodnotes@example.com`,
      goodnotesConnected: true,
      goodnotesVerifiedAt: "2026-04-02T00:00:00.000Z",
      goodnotesLastTestSentAt: "2026-04-02T00:00:00.000Z",
      goodnotesLastDeliveryStatus: deliveryStatus,
      goodnotesLastDeliveryMessage:
        deliveryStatus === "success" ? "Ready." : "Relay timeout.",
      notionConnected: false,
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
    },
  };
}

describe("OperationsHealthAdminPage", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.DAILY_BRIEF_SYNTHETIC_CANARY_ENABLED;
    delete process.env.DAILY_BRIEF_SYNTHETIC_CANARY_PARENT_EMAILS;
    listOperationsHealthRunsMock.mockReset();
    listDailyBriefHistoryMock.mockReset();
    listParentProfilesMock.mockReset();
    listPlannedNotificationRunHistoryMock.mockReset();
    listGeoMonitoringRunsMock.mockReset();
    getDailyBriefBusinessDateMock.mockReset();
    buildPlannedNotificationOpsQueueMock.mockReset();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test("renders the operations health dashboard and recent evidence", async () => {
    process.env.DAILY_BRIEF_SYNTHETIC_CANARY_ENABLED = "true";
    process.env.DAILY_BRIEF_SYNTHETIC_CANARY_PARENT_EMAILS =
      "admin@geledtech.com,ops-backup@geledtech.com";
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
          syntheticCanary: {
            enabled: true,
            configuredParentEmails: [
              "admin@geledtech.com",
              "ops-backup@geledtech.com",
            ],
            selectedParentEmail: "ops-backup@geledtech.com",
            healthyParentEmails: ["ops-backup@geledtech.com"],
            fallbackActivated: true,
            blocksProduction: false,
            unhealthyTargets: [
              {
                parentEmail: "admin@geledtech.com",
                reason: "Goodnotes delivery is not healthy right now.",
              },
            ],
          },
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
    listParentProfilesMock.mockResolvedValue([
      buildProfile("admin@geledtech.com", "failed"),
      buildProfile("ops-backup@geledtech.com", "success"),
    ]);
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
    expect(markup).toContain("Synthetic canary readiness");
    expect(markup).toContain("ops-backup@geledtech.com");
    expect(markup).toContain("Fallback backup is active");
    expect(markup).toContain("Ops readiness");
    expect(markup).toContain("Production stabilization checklist");
    expect(markup).toContain("Confirm canary passes before trusting today&#x27;s production wave.");
    expect(markup).toContain("Ops drill plan");
    expect(markup).toContain("Simulate canary fail");
    expect(markup).toContain("Incident runbook / SOP");
    expect(markup).toContain("Use rerun canary first when the blocked wave still needs a fresh synthetic proof.");
    expect(markup).toContain("Shift handoff summary");
    expect(markup).toContain("Copy Markdown");
    expect(markup).toContain("Download TXT");
    expect(markup).toContain("Notifications require manual intervention");
    expect(markup).toContain("retry-delivery");
    expect(markup).toContain("admin@geledtech.com");
  });
});
