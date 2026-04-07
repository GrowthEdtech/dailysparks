import { describe, expect, test, vi } from "vitest";

import type { GeoMonitoringRunRecord } from "./geo-monitoring-run-schema";
import type { OperationsHealthAlertDispatchResult } from "./operations-health-alerts";
import type { OperationsHealthRunRecord } from "./operations-health-run-schema";
import { runOperationsHealthCycle } from "./operations-health-runner";

type MockContext = Parameters<typeof runOperationsHealthCycle>[0]["readContext"] extends (
  ...args: never[]
) => Promise<infer T>
  ? T
  : never;

function buildContext(overrides: Partial<MockContext> = {}): MockContext {
  return {
    runDate: "2026-04-06",
    dailyBriefHistory: [],
    plannedNotificationQueue: {
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
    },
    plannedNotificationHistory: [],
    geoRuns: [],
    ...overrides,
  };
}

describe("runOperationsHealthCycle", () => {
  test("runs retry, reconciliation, and geo remediation when health policy says they are needed", async () => {
    const readContextMock = vi
      .fn<() => Promise<MockContext>>()
      .mockResolvedValueOnce(
        buildContext({
          dailyBriefHistory: [
            {
              id: "brief-1",
              scheduledFor: "2026-04-06",
              recordKind: "production",
              headline: "Headline",
              normalizedHeadline: "headline",
              summary: "Summary",
              programme: "PYP",
              editorialCohort: "APAC",
              status: "approved",
              topicClusterKey: "topic",
              topicLatestPublishedAt: null,
              selectionDecision: "new",
              selectionOverrideNote: "",
              blockedTopics: [],
              topicTags: [],
              sourceReferences: [],
              aiConnectionId: "ai-1",
              aiConnectionName: "Default",
              aiModel: "gpt-5.4",
              promptPolicyId: "policy-1",
              promptVersionLabel: "v1",
              promptVersion: "1",
              repetitionRisk: "low",
              repetitionNotes: "",
              adminNotes: "",
              briefMarkdown: "body",
              pipelineStage: "preflight_passed",
              candidateSnapshotAt: "2026-04-06T00:00:00.000Z",
              generationCompletedAt: "2026-04-06T00:10:00.000Z",
              pdfBuiltAt: "2026-04-06T00:12:00.000Z",
              deliveryWindowAt: "2026-04-06T01:00:00.000Z",
              lastDeliveryAttemptAt: "2026-04-06T01:00:00.000Z",
              deliveryAttemptCount: 1,
              deliverySuccessCount: 0,
              deliveryFailureCount: 1,
              dispatchMode: "production",
              dispatchCanaryParentEmails: [],
              targetedProfiles: [],
              skippedProfiles: [],
              pendingFutureProfiles: [],
              heldProfiles: [],
              renderAudit: null,
              syntheticCanary: {
                status: "blocked",
                targetParentEmails: ["admin@geledtech.com"],
                attemptCount: 2,
                successCount: 0,
                failureCount: 2,
                autoRetryCount: 1,
                lastAttemptAt: "2026-04-06T07:55:00.000Z",
                lastPassedAt: null,
                blockedAt: "2026-04-06T07:55:00.000Z",
                releasedAt: null,
                releasedBy: null,
                releaseReason: "",
                lastFailureReason: "Synthetic canary delivery failed after one automatic retry.",
                lastFailedTargets: [
                  {
                    parentId: "admin-parent",
                    parentEmail: "admin@geledtech.com",
                    channel: "goodnotes",
                    errorMessage: "Relay timeout",
                  },
                ],
                lastDeliveryReceipts: [],
                renderAudit: {
                  renderer: "typst",
                  layoutVariant: "pyp-one-page",
                  pageCount: 1,
                  onePageCompliant: true,
                  pagePolicyLabel: "PYP one-page",
                  pagePolicyPageCountLimit: 1,
                  pagePolicyCompliant: true,
                  auditedAt: "2026-04-06T07:55:00.000Z",
                },
              },
              deliveryReceipts: [],
              failedDeliveryTargets: [
                {
                  parentId: "parent-1",
                  parentEmail: "parent@example.com",
                  channel: "goodnotes",
                  errorMessage: "Relay timeout",
                },
              ],
              failureReason: "",
              retryEligibleUntil: "2026-04-06T08:30:00.000Z",
              createdAt: "2026-04-06T00:00:00.000Z",
              updatedAt: "2026-04-06T01:00:00.000Z",
            },
          ],
          plannedNotificationQueue: {
            summary: {
              totalCount: 1,
              pendingCount: 1,
              retryDueCount: 0,
              coolingDownCount: 0,
              escalatedCount: 0,
              dedupedCount: 0,
              under24hCount: 1,
              between24hAnd72hCount: 0,
              over72hCount: 0,
            },
            items: [
              {
                id: "parent-1:billing-status-update",
                parentId: "parent-1",
                parentEmail: "parent@example.com",
                parentName: "Parent Example",
                studentName: "Student",
                programmeLabel: "MYP 4",
                notificationFamily: "billing-status-update",
                notificationLabel: "Billing status",
                queueLabel: "Pending",
                detail: "Billing update is due.",
                lastSentAt: null,
                lastResolvedAt: null,
                lastFailureAt: null,
                retryAvailableAt: null,
                failureCount: 0,
                deduped: false,
                assignee: null,
                opsNote: null,
                collaborationUpdatedAt: null,
                ageStartedAt: "2026-04-06T07:00:00.000Z",
                ageHours: 1,
                agingLabel: "Under 24h",
              },
            ],
          },
          geoRuns: [
            {
              id: "geo-1",
              source: "scheduled",
              status: "failed",
              activePromptCount: 8,
              expandedQueryCount: 24,
              engineAttemptCount: 24,
              createdLogCount: 0,
              skippedCount: 0,
              failedCount: 24,
              machineReadabilityReadyCount: 4,
              notes: "Relay timed out after 15000ms.",
              startedAt: "2026-04-06T07:30:00.000Z",
              completedAt: "2026-04-06T07:31:00.000Z",
              engineBreakdown: [],
            } satisfies GeoMonitoringRunRecord,
          ],
        }),
      )
      .mockResolvedValueOnce(
        buildContext({
          dailyBriefHistory: [],
          plannedNotificationQueue: {
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
          },
          geoRuns: [
            {
              id: "geo-2",
              source: "scheduled",
              status: "completed",
              activePromptCount: 8,
              expandedQueryCount: 24,
              engineAttemptCount: 24,
              createdLogCount: 24,
              skippedCount: 0,
              failedCount: 0,
              machineReadabilityReadyCount: 4,
              notes: "",
              startedAt: "2026-04-06T08:02:00.000Z",
              completedAt: "2026-04-06T08:03:00.000Z",
              engineBreakdown: [],
            } satisfies GeoMonitoringRunRecord,
          ],
        }),
      );
    const runRetryDeliveryMock = vi.fn().mockResolvedValue({
      mode: "retry-delivery",
      summary: { retriedCount: 1, deliverySuccessCount: 1 },
    });
    const runGrowthReconciliationMock = vi.fn().mockResolvedValue({
      mode: "growth-reconciliation",
      notificationRun: {
        trialEnding: { checkedCount: 0, sentCount: 0, skippedCount: 0 },
        billingStatus: { checkedCount: 1, sentCount: 1, skippedCount: 0 },
        deliverySupport: { checkedCount: 0, sentCount: 0, skippedCount: 0 },
      },
    });
    const runGeoMonitoringMock = vi.fn().mockResolvedValue({
      mode: "geo-monitoring",
      run: { status: "completed" },
      summary: { logCreatedCount: 24 },
    });
    const emitAlertMock = vi
      .fn<(_: never) => Promise<OperationsHealthAlertDispatchResult>>()
      .mockResolvedValue({
        delivered: true,
        usedWebhook: false,
        webhookDelivered: false,
        webhookUsed: false,
        emailDelivered: true,
        emailUsed: true,
        emailRecipient: "admin@geledtech.com",
        emailMessageId: "ops-alert-message-id",
      });
    const createRunMock = vi
      .fn<(input: OperationsHealthRunRecord) => Promise<OperationsHealthRunRecord>>()
      .mockImplementation(async (input) => input);

    const result = await runOperationsHealthCycle({
      source: "scheduled",
      now: new Date("2026-04-06T08:00:00.000Z"),
      readContext: readContextMock,
      runRetryDelivery: runRetryDeliveryMock,
      runGrowthReconciliation: runGrowthReconciliationMock,
      runGeoMonitoring: runGeoMonitoringMock,
      emitAlert: emitAlertMock,
      createRun: createRunMock,
    });

    expect(runRetryDeliveryMock).toHaveBeenCalledTimes(1);
    expect(runGrowthReconciliationMock).toHaveBeenCalledTimes(1);
    expect(runGeoMonitoringMock).toHaveBeenCalledTimes(1);
    expect(readContextMock).toHaveBeenCalledTimes(2);
    expect(createRunMock).toHaveBeenCalledTimes(1);
    expect(result.run.alerts[0]).toEqual(
      expect.objectContaining({
        emailDelivered: true,
        emailUsed: true,
        emailRecipient: "admin@geledtech.com",
        emailMessageId: "ops-alert-message-id",
      }),
    );
    expect(result.run.remediationActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "retry-delivery",
          status: "executed",
        }),
        expect.objectContaining({
          action: "blocked-canary-review",
          status: "executed",
        }),
        expect.objectContaining({
          action: "growth-reconciliation",
          status: "executed",
        }),
        expect.objectContaining({
          action: "geo-monitoring",
          status: "executed",
        }),
      ]),
    );
    expect(result.snapshot.status).toBe("critical");
  });
});
