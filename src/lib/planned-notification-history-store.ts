import { firestorePlannedNotificationHistoryStore } from "./firestore-planned-notification-history-store";
import { localPlannedNotificationHistoryStore } from "./local-planned-notification-history-store";
import type {
  PlannedNotificationRunRecord,
  PlannedNotificationRunSource,
  PlannedNotificationRunStatus,
} from "./planned-notification-history-schema";
import type { PlannedNotificationHistoryStore } from "./planned-notification-history-store-types";
import type { PlannedNotificationFamily } from "./planned-notification-state";
import {
  getProfileStoreBackend,
  validateProfileStoreConfig,
} from "./profile-store-config";

type CreatePlannedNotificationRunEntryInput = Omit<
  PlannedNotificationRunRecord,
  "id" | "runDate" | "createdAt"
>;

type PlannedNotificationRunContextInput = {
  runAt: string;
  parentId: string;
  parentEmail: string;
  notificationFamily: PlannedNotificationFamily;
  source: PlannedNotificationRunSource;
  status: PlannedNotificationRunStatus;
  reason?: string | null;
  deduped?: boolean;
  messageId?: string | null;
  errorMessage?: string | null;
  invoiceId?: string | null;
  invoiceStatus?: string | null;
  trialEndsAt?: string | null;
  reasonKey?: string | null;
  assignee?: string | null;
  opsNote?: string | null;
};

function getPlannedNotificationHistoryStore(): PlannedNotificationHistoryStore {
  validateProfileStoreConfig();

  return getProfileStoreBackend() === "firestore"
    ? firestorePlannedNotificationHistoryStore
    : localPlannedNotificationHistoryStore;
}

export async function listPlannedNotificationRunHistory() {
  return getPlannedNotificationHistoryStore().listEntries();
}

export async function createPlannedNotificationRunEntry(
  input: CreatePlannedNotificationRunEntryInput,
) {
  const timestamp = new Date().toISOString();
  const runAt = input.runAt.trim();
  const record: PlannedNotificationRunRecord = {
    id: crypto.randomUUID(),
    runAt,
    runDate: runAt.slice(0, 10),
    parentId: input.parentId.trim(),
    parentEmail: input.parentEmail.trim(),
    notificationFamily: input.notificationFamily,
    source: input.source,
    status: input.status,
    reason: input.reason?.trim() || null,
    deduped: input.deduped === true,
    messageId: input.messageId?.trim() || null,
    errorMessage: input.errorMessage?.trim() || null,
    invoiceId: input.invoiceId?.trim() || null,
    invoiceStatus: input.invoiceStatus?.trim() || null,
    trialEndsAt: input.trialEndsAt?.trim() || null,
    reasonKey: input.reasonKey?.trim() || null,
    assignee: input.assignee?.trim() || null,
    opsNote: input.opsNote?.trim() || null,
    createdAt: timestamp,
  };

  return getPlannedNotificationHistoryStore().createEntry(record);
}

export async function recordPlannedNotificationRun(
  input: PlannedNotificationRunContextInput,
) {
  return createPlannedNotificationRunEntry({
    runAt: input.runAt,
    parentId: input.parentId,
    parentEmail: input.parentEmail,
    notificationFamily: input.notificationFamily,
    source: input.source,
    status: input.status,
    reason: input.reason ?? null,
    deduped: input.deduped ?? false,
    messageId: input.messageId ?? null,
    errorMessage: input.errorMessage ?? null,
    invoiceId: input.invoiceId ?? null,
    invoiceStatus: input.invoiceStatus ?? null,
    trialEndsAt: input.trialEndsAt ?? null,
    reasonKey: input.reasonKey ?? null,
    assignee: input.assignee ?? null,
    opsNote: input.opsNote ?? null,
  });
}
