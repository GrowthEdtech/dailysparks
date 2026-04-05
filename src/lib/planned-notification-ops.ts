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
const PLANNED_NOTIFICATION_SLA_WARNING_HOURS = 24;
const PLANNED_NOTIFICATION_SLA_BREACH_HOURS = 72;

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
  assignee: string | null;
  opsNote: string | null;
  collaborationUpdatedAt: string | null;
  ageStartedAt: string | null;
  ageHours: number;
  agingLabel: "Under 24h" | "24-72h" | "Older than 72h";
};

export type PlannedNotificationOpsQueueSummary = {
  totalCount: number;
  pendingCount: number;
  retryDueCount: number;
  coolingDownCount: number;
  escalatedCount: number;
  dedupedCount: number;
  under24hCount: number;
  between24hAnd72hCount: number;
  over72hCount: number;
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

function getCurrentStateHistoryAndCurrentState(
  profile: ParentProfile,
  notificationFamily: PlannedNotificationFamily,
  history: PlannedNotificationRunRecord[],
  now = new Date(),
) {
  const currentState = getCurrentState(profile, notificationFamily, now);

  return {
    currentState,
    currentStateHistory: currentState
      ? history
          .filter(
            (entry) =>
              entry.parentId === profile.parent.id &&
              entry.notificationFamily === notificationFamily &&
              matchesCurrentState(entry, currentState),
          )
          .sort((left, right) => right.runAt.localeCompare(left.runAt))
      : ([] as PlannedNotificationRunRecord[]),
  };
}

function getLatestCollaborationEntry(
  currentStateHistory: PlannedNotificationRunRecord[],
) {
  return (
    currentStateHistory.find(
      (entry) =>
        entry.status === "annotated" ||
        entry.assignee !== null ||
        entry.opsNote !== null,
    ) ?? null
  );
}

function getFirstNonEmptyTimestamp(
  ...values: Array<string | null | undefined>
): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      const timestamp = Date.parse(value);

      if (!Number.isNaN(timestamp)) {
        return new Date(timestamp).toISOString();
      }
    }
  }

  return null;
}

function inferAgeStartedAt(input: {
  profile: ParentProfile;
  status: PlannedNotificationStatus;
  currentState: PlannedNotificationCurrentState | null;
  currentStateHistory: PlannedNotificationRunRecord[];
}): string | null {
  const oldestCurrentStateEntry = input.currentStateHistory.at(-1);

  if (oldestCurrentStateEntry?.runAt) {
    return oldestCurrentStateEntry.runAt;
  }

  if (input.status.deduped && input.status.lastSentAt) {
    return input.status.lastSentAt;
  }

  if (!input.currentState) {
    return getFirstNonEmptyTimestamp(input.profile.parent.updatedAt);
  }

  if (input.currentState.family === "trial-ending-reminder") {
    const trialEndsAt = Date.parse(input.currentState.trialEndsAt);

    if (!Number.isNaN(trialEndsAt)) {
      return new Date(
        trialEndsAt - PLANNED_NOTIFICATION_SLA_BREACH_HOURS * 60 * 60 * 1000,
      ).toISOString();
    }
  }

  if (input.currentState.family === "billing-status-update") {
    return getFirstNonEmptyTimestamp(
      input.profile.parent.latestInvoicePaidAt,
      input.profile.parent.latestInvoicePeriodStart,
      input.profile.parent.latestInvoicePeriodEnd,
      input.profile.parent.updatedAt,
      input.profile.parent.createdAt,
    );
  }

  const normalizedReason = input.currentState.reason.toLowerCase();

  if (normalizedReason.includes("first brief has not been recorded as delivered")) {
    return getFirstNonEmptyTimestamp(
      input.profile.parent.firstDispatchableChannelAt,
      input.profile.parent.subscriptionActivatedAt,
      input.profile.parent.firstPaidAt,
      input.profile.parent.trialStartedAt,
      input.profile.parent.createdAt,
    );
  }

  if (normalizedReason.includes("latest onboarding reminder failed")) {
    return getFirstNonEmptyTimestamp(
      input.profile.parent.onboardingReminderLastAttemptAt,
      input.profile.parent.subscriptionActivatedAt,
      input.profile.parent.firstPaidAt,
      input.profile.parent.trialStartedAt,
      input.profile.parent.createdAt,
    );
  }

  return getFirstNonEmptyTimestamp(
    input.profile.parent.subscriptionActivatedAt,
    input.profile.parent.firstPaidAt,
    input.profile.parent.trialStartedAt,
    input.profile.parent.createdAt,
  );
}

function getAgeHours(ageStartedAt: string | null, now: Date) {
  if (!ageStartedAt) {
    return 0;
  }

  const timestamp = Date.parse(ageStartedAt);

  if (Number.isNaN(timestamp)) {
    return 0;
  }

  return Math.max(0, Math.floor((now.getTime() - timestamp) / (60 * 60 * 1000)));
}

function getAgingLabel(ageHours: number): PlannedNotificationOpsQueueItem["agingLabel"] {
  if (ageHours >= PLANNED_NOTIFICATION_SLA_BREACH_HOURS) {
    return "Older than 72h";
  }

  if (ageHours >= PLANNED_NOTIFICATION_SLA_WARNING_HOURS) {
    return "24-72h";
  }

  return "Under 24h";
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
    under24hCount: 0,
    between24hAnd72hCount: 0,
    over72hCount: 0,
  };
}

function pushSummaryCount(
  summary: PlannedNotificationOpsQueueSummary,
  item: PlannedNotificationOpsQueueItem,
) {
  summary.totalCount += 1;

  if (item.queueLabel === "Pending") {
    summary.pendingCount += 1;
  } else if (item.queueLabel === "Retry due") {
    summary.retryDueCount += 1;
  } else if (item.queueLabel === "Cooling down") {
    summary.coolingDownCount += 1;
  } else if (item.queueLabel === "Manual intervention required") {
    summary.escalatedCount += 1;
  } else {
    summary.dedupedCount += 1;
  }

  if (item.agingLabel === "Older than 72h") {
    summary.over72hCount += 1;
    return;
  }

  if (item.agingLabel === "24-72h") {
    summary.between24hAnd72hCount += 1;
    return;
  }

  summary.under24hCount += 1;
}

function buildQueueItem(input: {
  profile: ParentProfile;
  notificationFamily: PlannedNotificationFamily;
  status: PlannedNotificationStatus;
  retryDecision: PlannedNotificationRetryDecision;
  currentState: PlannedNotificationCurrentState | null;
  currentStateHistory: PlannedNotificationRunRecord[];
  now: Date;
}): PlannedNotificationOpsQueueItem | null {
  const {
    profile,
    notificationFamily,
    status,
    retryDecision,
    currentState,
    currentStateHistory,
    now,
  } = input;

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

  const ageStartedAt = inferAgeStartedAt({
    profile,
    status,
    currentState,
    currentStateHistory,
  });
  const latestCollaborationEntry = getLatestCollaborationEntry(currentStateHistory);
  const ageHours = getAgeHours(ageStartedAt, now);
  const agingLabel = getAgingLabel(ageHours);

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
    assignee: latestCollaborationEntry?.assignee ?? null,
    opsNote: latestCollaborationEntry?.opsNote ?? null,
    collaborationUpdatedAt: latestCollaborationEntry?.runAt ?? null,
    ageStartedAt,
    ageHours,
    agingLabel,
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
      .map((notificationFamily) => {
        const { currentState, currentStateHistory } = getCurrentStateHistoryAndCurrentState(
          profile,
          notificationFamily,
          input.history,
          now,
        );

        return buildQueueItem({
          profile,
          notificationFamily,
          status: getNotificationStatus(profile, notificationFamily, now),
          retryDecision: getPlannedNotificationRetryDecision({
            profile,
            notificationFamily,
            history: input.history,
            now,
          }),
          currentState,
          currentStateHistory,
          now,
        });
      })
      .filter((item): item is PlannedNotificationOpsQueueItem => item !== null);

    return queueItems;
  });

  for (const item of items) {
    pushSummaryCount(summary, item);
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
      right.ageHours - left.ageHours ||
      left.parentEmail.localeCompare(right.parentEmail)
    );
  });

  return {
    summary,
    items,
  };
}
