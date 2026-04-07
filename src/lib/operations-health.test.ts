import { describe, expect, test } from "vitest";

import type { DailyBriefHistoryRecord } from "./daily-brief-history-schema";
import type { GeoMonitoringRunRecord } from "./geo-monitoring-run-schema";
import type { PlannedNotificationRunRecord } from "./planned-notification-history-schema";
import type { PlannedNotificationOpsQueue } from "./planned-notification-ops";
import { buildOperationsHealthSnapshot } from "./operations-health";

function buildBrief(
  overrides: Partial<DailyBriefHistoryRecord>,
): DailyBriefHistoryRecord {
  return {
    id: crypto.randomUUID(),
    scheduledFor: "2026-04-06",
    recordKind: "production",
    headline: "Headline",
    normalizedHeadline: "headline",
    summary: "Summary",
    programme: "PYP",
    editorialCohort: "APAC",
    status: "published",
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
    pipelineStage: "published",
    candidateSnapshotAt: "2026-04-06T00:00:00.000Z",
    generationCompletedAt: "2026-04-06T00:10:00.000Z",
    pdfBuiltAt: "2026-04-06T00:12:00.000Z",
    deliveryWindowAt: "2026-04-06T01:00:00.000Z",
    lastDeliveryAttemptAt: "2026-04-06T01:00:00.000Z",
    deliveryAttemptCount: 1,
    deliverySuccessCount: 1,
    deliveryFailureCount: 0,
    dispatchMode: "production",
    dispatchCanaryParentEmails: [],
    targetedProfiles: [],
    skippedProfiles: [],
    pendingFutureProfiles: [],
    heldProfiles: [],
    renderAudit: {
      renderer: "typst",
      layoutVariant: "standard",
      pageCount: 1,
      onePageCompliant: null,
      pagePolicyLabel: null,
      pagePolicyPageCountLimit: null,
      pagePolicyCompliant: null,
      auditedAt: "2026-04-06T00:12:00.000Z",
    },
    deliveryReceipts: [],
    failedDeliveryTargets: [],
    failureReason: "",
    retryEligibleUntil: null,
    createdAt: "2026-04-06T00:00:00.000Z",
    updatedAt: "2026-04-06T01:00:00.000Z",
    ...overrides,
  };
}

function buildGeoRun(
  overrides: Partial<GeoMonitoringRunRecord>,
): GeoMonitoringRunRecord {
  return {
    id: crypto.randomUUID(),
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
    startedAt: "2026-04-06T07:30:00.000Z",
    completedAt: "2026-04-06T07:32:00.000Z",
    engineBreakdown: [],
    ...overrides,
  };
}

function buildNotificationHistory(
  overrides: Partial<PlannedNotificationRunRecord>,
): PlannedNotificationRunRecord {
  return {
    id: crypto.randomUUID(),
    runAt: "2026-04-06T06:40:00.000Z",
    runDate: "2026-04-06",
    parentId: "parent-1",
    parentEmail: "parent@example.com",
    notificationFamily: "billing-status-update",
    source: "growth-reconciliation",
    status: "sent",
    reason: "Invoice paid.",
    deduped: false,
    messageId: "msg-1",
    errorMessage: null,
    invoiceId: "in_1",
    invoiceStatus: "paid",
    trialEndsAt: null,
    reasonKey: null,
    assignee: null,
    opsNote: null,
    createdAt: "2026-04-06T06:40:00.000Z",
    ...overrides,
  };
}

function buildNotificationQueue(
  overrides: Partial<PlannedNotificationOpsQueue> = {},
): PlannedNotificationOpsQueue {
  return {
    summary: {
      totalCount: 3,
      pendingCount: 1,
      retryDueCount: 1,
      coolingDownCount: 0,
      escalatedCount: 1,
      dedupedCount: 0,
      under24hCount: 1,
      between24hAnd72hCount: 1,
      over72hCount: 1,
      ...(overrides.summary ?? {}),
    },
    items: overrides.items ?? [
      {
        id: "parent-1:billing-status-update",
        parentId: "parent-1",
        parentEmail: "parent@example.com",
        parentName: "Parent Example",
        studentName: "Student",
        programmeLabel: "MYP 4",
        notificationFamily: "billing-status-update",
        notificationLabel: "Billing status",
        queueLabel: "Manual intervention required",
        detail: "Invoice update needs manual follow-up.",
        lastSentAt: null,
        lastResolvedAt: null,
        lastFailureAt: "2026-04-03T00:00:00.000Z",
        retryAvailableAt: null,
        failureCount: 2,
        deduped: false,
        assignee: null,
        opsNote: null,
        collaborationUpdatedAt: null,
        ageStartedAt: "2026-04-03T00:00:00.000Z",
        ageHours: 80,
        agingLabel: "Older than 72h",
      },
    ],
  };
}

describe("buildOperationsHealthSnapshot", () => {
  test("derives cross-system health, SLA alerts, and billing evidence from existing stores", () => {
    const snapshot = buildOperationsHealthSnapshot({
      runDate: "2026-04-06",
      now: new Date("2026-04-06T08:00:00.000Z"),
      dailyBriefHistory: [
        buildBrief({
          editorialCohort: "APAC",
          programme: "PYP",
        }),
        buildBrief({
          editorialCohort: "APAC",
          programme: "MYP",
          status: "approved",
          pipelineStage: "preflight_passed",
          deliverySuccessCount: 0,
          deliveryReceipts: [],
          failedDeliveryTargets: [
            {
              parentId: "retry-parent",
              parentEmail: "retry@example.com",
              channel: "goodnotes",
              errorMessage: "Relay timeout",
            },
          ],
          deliveryFailureCount: 1,
          retryEligibleUntil: "2026-04-06T08:30:00.000Z",
        }),
        buildBrief({
          editorialCohort: "EMEA",
          programme: "DP",
          status: "failed",
          pipelineStage: "failed",
          failureReason: "Prompt policy missing.",
        }),
        buildBrief({
          editorialCohort: "AMER",
          programme: "MYP",
          status: "approved",
          pipelineStage: "preflight_passed",
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
                parentId: "parent-canary",
                parentEmail: "admin@geledtech.com",
                channel: "goodnotes",
                errorMessage: "Relay timeout",
              },
            ],
            lastDeliveryReceipts: [],
            renderAudit: {
              renderer: "typst",
              layoutVariant: "myp-compare",
              pageCount: 2,
              onePageCompliant: null,
              pagePolicyLabel: "MYP compare-only",
              pagePolicyPageCountLimit: 2,
              pagePolicyCompliant: true,
              auditedAt: "2026-04-06T07:55:00.000Z",
            },
          },
          failureReason: "Synthetic canary gate blocked production delivery.",
        }),
      ],
      plannedNotificationQueue: buildNotificationQueue(),
      plannedNotificationHistory: [
        buildNotificationHistory(),
        buildNotificationHistory({
          id: "billing-failed",
          status: "failed",
          errorMessage: "SMTP offline",
          messageId: null,
        }),
      ],
      geoRuns: [
        buildGeoRun({
          status: "partial",
          failedCount: 2,
          notes:
            "chatgpt-search monitoring check timed out after 15000ms. Latest run completed with partial coverage.",
        }),
      ],
    });

    expect(snapshot.status).toBe("critical");
    expect(snapshot.dailyBrief.expectedProductionCount).toBe(9);
    expect(snapshot.dailyBrief.generatedCount).toBe(4);
    expect(snapshot.dailyBrief.missingProductionCount).toBe(5);
    expect(snapshot.dailyBrief.retryCandidateCount).toBe(1);
    expect(snapshot.dailyBrief.blockedCanaryCount).toBe(1);
    expect(snapshot.notifications.escalatedCount).toBe(1);
    expect(snapshot.notifications.over72hCount).toBe(1);
    expect(snapshot.geo.latestRunStatus).toBe("partial");
    expect(snapshot.geo.timeoutCount).toBe(1);
    expect(snapshot.billing.actionableCount).toBe(1);
    expect(snapshot.billing.sentTodayCount).toBe(1);
    expect(snapshot.billing.failedTodayCount).toBe(1);
    expect(snapshot.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          area: "daily-brief",
          severity: "critical",
        }),
        expect.objectContaining({
          area: "daily-brief",
          title: "Production briefs are blocked by synthetic canary",
          severity: "critical",
          metricValue: 1,
        }),
        expect.objectContaining({
          area: "geo-monitoring",
          severity: "warning",
        }),
        expect.objectContaining({
          area: "billing-status",
          severity: "warning",
        }),
      ]),
    );
  });
});
