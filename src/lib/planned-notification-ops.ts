import type { ParentProfile } from "./mvp-types";
import type { PlannedNotificationRunRecord } from "./planned-notification-history-schema";
import {
  getBillingStatusNotificationCurrentState,
  getBillingStatusNotificationStatus,
  getDeliverySupportNotificationCurrentState,
  getDeliverySupportNotificationStatus,
  getTrialEndingNotificationCurrentState,
  getTrialEndingNotificationStatus,
  type BillingStatusNotificationCurrentState,
  type DeliverySupportNotificationCurrentState,
  type PlannedNotificationFamily,
  type PlannedNotificationStatus,
  type TrialEndingNotificationCurrentState,
} from "./planned-notification-state";

export const PLANNED_NOTIFICATION_RETRY_COOLDOWN_MINUTES = 30;
export const PLANNED_NOTIFICATION_ESCALATE_AFTER_FAILURES = 2;

type PlannedNotificationCurrentState =
  | TrialEndingNotificationCurrentState
  | BillingStatusNotificationCurrentState
  | DeliverySupportNotificationCurrentState;

export type PlannedNotificationRetryDecision = {
  kind: "not-needed" | "pending" | "retry-due" | "cooldown" | "escalated";
  failureCount: number;
  lastFailureAt: string | null;
  retryAvailableAt: string | null;
  lastErrorMessage: string | null;
};

export type PlannedNotificationOpsQueueItem = {
  id: string;
  parentId: string;
  parentEmail: string;
  parentName: string;
  studentName: string;
  programmeLabel: string;
  notificationFamily: PlannedNotificationFamily;
  notificationLabel: string;
  queueLabel:
    | "Pending"
    | "Retry due"
    | "Cooling down"
    | "Manual intervention required"
    | "Deduped unresolved";
  detail: string;
  lastSentAt: string | null;
  lastResolvedAt: string | null;
  lastFailureAt: string | null;
  retryAvailableAt: string | null;
  failureCount: number;
  deduped: boolean;
};

export type PlannedNotificationOpsQueueSummary = {
  totalCount: number;
  pendingCount: number;
  retryDueCount: number;
  coolingDownCount: number;
  escalatedCount: number;
  dedupedCount: number;
};

export type PlannedNotificationOpsQueue = {
  summary: PlannedNotificationOpsQueueSummary;
  items: PlannedNotificationOpsQueueItem[];
};

function getNotificationLabel(family: PlannedNotificationFamily) {
  if (family === "trial-ending-reminder") {
    return "Trial ending";
  }

  if (family === "billing-status-update") {
    return "Billing status";
  }

  return "Delivery support";
}

function getCurrentState(
  profile: ParentProfile,
  notificationFamily: PlannedNotificationFamily,
  now = new Date(),
): PlannedNotificationCurrentState | null {
  if (notificationFamily === "trial-ending-reminder") {
    return getTrialEndingNotificationCurrentState(profile, now);
  }

  if (notificationFamily === "billing-status-update") {
    return getBillingStatusNotificationCurrentState(profile);
  }

  return getDeliverySupportNotificationCurrentState(profile, now);
}

function getNotificationStatus(
  profile: ParentProfile,
  notificationFamily: PlannedNotificationFamily,
  now = new Date(),
): PlannedNotificationStatus {
  if (notificationFamily === "trial-ending-reminder") {
    return getTrialEndingNotificationStatus(profile, now);
  }

  if (notificationFamily === "billing-status-update") {
    return getBillingStatusNotificationStatus(profile);
  }

  return getDeliverySupportNotificationStatus(profile, now);
}

function matchesCurrentState(
  entry: PlannedNotificationRunRecord,
  currentState: PlannedNotificationCurrentState,
) {
  if (currentState.family === "trial-ending-reminder") {
    return entry.trialEndsAt === currentState.trialEndsAt;
  }

  if (currentState.family === "billing-status-update") {
    return (
      entry.invoiceId === currentState.invoiceId &&
      entry.invoiceStatus === currentState.invoiceStatus
    );
  }

  return entry.reasonKey === currentState.reasonKey;
}

function getCurrentStateHistory(
  profile: ParentProfile,
  notificationFamily: PlannedNotificationFamily,
  history: PlannedNotificationRunRecord[],
  now = new Date(),
) {
  const currentState = getCurrentState(profile, notificationFamily, now);

  if (!currentState) {
    return [] as PlannedNotificationRunRecord[];
  }

  return history
    .filter(
      (entry) =>
        entry.parentId === profile.parent.id &&
        entry.notificationFamily === notificationFamily &&
        matchesCurrentState(entry, currentState),
    )
    .sort((left, right) => right.runAt.localeCompare(left.runAt));
}

export function getPlannedNotificationRetryDecision(input: {
  profile: ParentProfile;
  notificationFamily: PlannedNotificationFamily;
  history: PlannedNotificationRunRecord[];
  now?: Date;
}): PlannedNotificationRetryDecision {
  const now = input.now ?? new Date();
  const currentStateHistory = getCurrentStateHistory(
    input.profile,
    input.notificationFamily,
    input.history,
    now,
  );

  if (currentStateHistory.length === 0) {
    if (!getCurrentState(input.profile, input.notificationFamily, now)) {
      return {
        kind: "not-needed",
        failureCount: 0,
        lastFailureAt: null,
        retryAvailableAt: null,
        lastErrorMessage: null,
      };
    }

    return {
      kind: "pending",
      failureCount: 0,
      lastFailureAt: null,
      retryAvailableAt: null,
      lastErrorMessage: null,
    };
  }

  const failedEntries = currentStateHistory.filter((entry) => entry.status === "failed");
  const failureCount = failedEntries.length;
  const lastFailure = failedEntries[0] ?? null;

  if (!lastFailure) {
    return {
      kind: "pending",
      failureCount: 0,
      lastFailureAt: null,
      retryAvailableAt: null,
      lastErrorMessage: null,
    };
  }

  if (failureCount >= PLANNED_NOTIFICATION_ESCALATE_AFTER_FAILURES) {
    return {
      kind: "escalated",
      failureCount,
      lastFailureAt: lastFailure.runAt,
      retryAvailableAt: null,
      lastErrorMessage: lastFailure.errorMessage,
    };
  }

  const retryAvailableAt = new Date(
    Date.parse(lastFailure.runAt) +
      PLANNED_NOTIFICATION_RETRY_COOLDOWN_MINUTES * 60 * 1000,
  ).toISOString();

  if (Date.parse(retryAvailableAt) > now.getTime()) {
    return {
      kind: "cooldown",
      failureCount,
      lastFailureAt: lastFailure.runAt,
      retryAvailableAt,
      lastErrorMessage: lastFailure.errorMessage,
    };
  }

  return {
    kind: "retry-due",
    failureCount,
    lastFailureAt: lastFailure.runAt,
    retryAvailableAt,
    lastErrorMessage: lastFailure.errorMessage,
  };
}

function createEmptySummary(): PlannedNotificationOpsQueueSummary {
  return {
    totalCount: 0,
    pendingCount: 0,
    retryDueCount: 0,
    coolingDownCount: 0,
    escalatedCount: 0,
    dedupedCount: 0,
  };
}

function pushSummaryCount(
  summary: PlannedNotificationOpsQueueSummary,
  label: PlannedNotificationOpsQueueItem["queueLabel"],
) {
  summary.totalCount += 1;

  if (label === "Pending") {
    summary.pendingCount += 1;
    return;
  }

  if (label === "Retry due") {
    summary.retryDueCount += 1;
    return;
  }

  if (label === "Cooling down") {
    summary.coolingDownCount += 1;
    return;
  }

  if (label === "Manual intervention required") {
    summary.escalatedCount += 1;
    return;
  }

  summary.dedupedCount += 1;
}

function buildQueueItem(input: {
  profile: ParentProfile;
  notificationFamily: PlannedNotificationFamily;
  status: PlannedNotificationStatus;
  retryDecision: PlannedNotificationRetryDecision;
}): PlannedNotificationOpsQueueItem | null {
  const { profile, notificationFamily, status, retryDecision } = input;

  if (!status.actionable) {
    return null;
  }

  let queueLabel: PlannedNotificationOpsQueueItem["queueLabel"] = "Pending";
  let detail = status.detail;

  if (status.deduped) {
    queueLabel = "Deduped unresolved";
  } else if (retryDecision.kind === "retry-due") {
    queueLabel = "Retry due";
    detail = retryDecision.lastErrorMessage
      ? `Automatic retry is now eligible. Last failure: ${retryDecision.lastErrorMessage}`
      : "Automatic retry is now eligible for the current notification state.";
  } else if (retryDecision.kind === "cooldown") {
    queueLabel = "Cooling down";
    detail = retryDecision.lastErrorMessage
      ? `Automatic retry is cooling down after a failed send. Last failure: ${retryDecision.lastErrorMessage}`
      : "Automatic retry is cooling down after a failed send.";
  } else if (retryDecision.kind === "escalated") {
    queueLabel = "Manual intervention required";
    detail = retryDecision.lastErrorMessage
      ? `The current state has failed ${retryDecision.failureCount} times. Last failure: ${retryDecision.lastErrorMessage}`
      : `The current state has failed ${retryDecision.failureCount} times and now needs manual intervention.`;
  }

  return {
    id: `${profile.parent.id}:${notificationFamily}`,
    parentId: profile.parent.id,
    parentEmail: profile.parent.email,
    parentName: profile.parent.fullName,
    studentName: profile.student.studentName,
    programmeLabel: `${profile.student.programme} ${profile.student.programmeYear}`,
    notificationFamily,
    notificationLabel: getNotificationLabel(notificationFamily),
    queueLabel,
    detail,
    lastSentAt: status.lastSentAt,
    lastResolvedAt: status.lastResolvedAt,
    lastFailureAt: retryDecision.lastFailureAt,
    retryAvailableAt: retryDecision.retryAvailableAt,
    failureCount: retryDecision.failureCount,
    deduped: status.deduped,
  };
}

export function buildPlannedNotificationOpsQueue(input: {
  profiles: ParentProfile[];
  history: PlannedNotificationRunRecord[];
  now?: Date;
}): PlannedNotificationOpsQueue {
  const now = input.now ?? new Date();
  const summary = createEmptySummary();
  const items = input.profiles.flatMap((profile) => {
    const queueItems = ([
      "trial-ending-reminder",
      "billing-status-update",
      "delivery-support-alert",
    ] as const)
      .map((notificationFamily) =>
        buildQueueItem({
          profile,
          notificationFamily,
          status: getNotificationStatus(profile, notificationFamily, now),
          retryDecision: getPlannedNotificationRetryDecision({
            profile,
            notificationFamily,
            history: input.history,
            now,
          }),
        }),
      )
      .filter((item): item is PlannedNotificationOpsQueueItem => item !== null);

    return queueItems;
  });

  for (const item of items) {
    pushSummaryCount(summary, item.queueLabel);
  }

  items.sort((left, right) => {
    const severityRank = {
      "Manual intervention required": 0,
      "Retry due": 1,
      "Cooling down": 2,
      "Pending": 3,
      "Deduped unresolved": 4,
    } satisfies Record<PlannedNotificationOpsQueueItem["queueLabel"], number>;

    return (
      severityRank[left.queueLabel] - severityRank[right.queueLabel] ||
      left.parentEmail.localeCompare(right.parentEmail)
    );
  });

  return {
    summary,
    items,
  };
}
