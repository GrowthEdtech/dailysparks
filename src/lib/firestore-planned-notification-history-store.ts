import { getFirebaseAdminDb } from "./firebase-admin";
import type {
  PlannedNotificationRunRecord,
} from "./planned-notification-history-schema";
import type { PlannedNotificationHistoryStore } from "./planned-notification-history-store-types";
import type { PlannedNotificationFamily } from "./planned-notification-state";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableString(value: unknown) {
  return normalizeString(value) || null;
}

function normalizeFamily(value: unknown): PlannedNotificationFamily {
  if (
    value === "trial-ending-reminder" ||
    value === "billing-status-update" ||
    value === "delivery-support-alert"
  ) {
    return value;
  }

  return "trial-ending-reminder";
}

function normalizeEntry(
  id: string,
  raw: Partial<PlannedNotificationRunRecord> | undefined,
): PlannedNotificationRunRecord {
  const createdAt = normalizeString(raw?.createdAt) || new Date().toISOString();
  const runAt = normalizeString(raw?.runAt) || createdAt;

  return {
    id,
    runAt,
    runDate: normalizeString(raw?.runDate) || runAt.slice(0, 10),
    parentId: normalizeString(raw?.parentId),
    parentEmail: normalizeString(raw?.parentEmail),
    notificationFamily: normalizeFamily(raw?.notificationFamily),
    source:
      raw?.source === "stripe-webhook" ||
      raw?.source === "manual-resend" ||
      raw?.source === "manual-resolve" ||
      raw?.source === "batch-resend" ||
      raw?.source === "batch-resolve"
        ? raw.source
        : "growth-reconciliation",
    status:
      raw?.status === "sent" ||
      raw?.status === "failed" ||
      raw?.status === "resolved" ||
      raw?.status === "deferred" ||
      raw?.status === "escalated"
        ? raw.status
        : "skipped",
    reason: normalizeNullableString(raw?.reason),
    deduped: raw?.deduped === true,
    messageId: normalizeNullableString(raw?.messageId),
    errorMessage: normalizeNullableString(raw?.errorMessage),
    invoiceId: normalizeNullableString(raw?.invoiceId),
    invoiceStatus: normalizeNullableString(raw?.invoiceStatus),
    trialEndsAt: normalizeNullableString(raw?.trialEndsAt),
    reasonKey: normalizeNullableString(raw?.reasonKey),
    createdAt,
  };
}

export const firestorePlannedNotificationHistoryStore: PlannedNotificationHistoryStore = {
  async listEntries() {
    const db = getFirebaseAdminDb();
    const snapshot = await db
      .collection("plannedNotificationHistory")
      .orderBy("runAt", "desc")
      .get();

    return snapshot.docs.map((document) =>
      normalizeEntry(
        document.id,
        document.data() as Partial<PlannedNotificationRunRecord> | undefined,
      ),
    );
  },

  async createEntry(record) {
    const db = getFirebaseAdminDb();
    const normalized = normalizeEntry(record.id, record);
    await db.collection("plannedNotificationHistory").doc(normalized.id).set(normalized);
    return normalized;
  },
};
