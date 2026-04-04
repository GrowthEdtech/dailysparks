import { getFirebaseAdminDb } from "./firebase-admin";
import type { OnboardingReminderStatus } from "./mvp-types";
import type { OnboardingReminderRunRecord } from "./onboarding-reminder-history-schema";
import type { OnboardingReminderHistoryStore } from "./onboarding-reminder-history-store-types";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableString(value: unknown) {
  return normalizeString(value) || null;
}

function normalizeStatus(value: unknown): OnboardingReminderStatus {
  return value === "failed" ? "failed" : "sent";
}

function normalizeEntry(
  id: string,
  raw: Partial<OnboardingReminderRunRecord> | undefined,
): OnboardingReminderRunRecord {
  const createdAt = normalizeString(raw?.createdAt) || new Date().toISOString();
  const runAt = normalizeString(raw?.runAt) || createdAt;

  return {
    id,
    runAt,
    runDate: normalizeString(raw?.runDate) || runAt.slice(0, 10),
    parentId: normalizeString(raw?.parentId),
    parentEmail: normalizeString(raw?.parentEmail),
    stageIndex:
      typeof raw?.stageIndex === "number" &&
      Number.isFinite(raw.stageIndex) &&
      raw.stageIndex > 0
        ? Math.trunc(raw.stageIndex)
        : 1,
    stageLabel: normalizeString(raw?.stageLabel),
    status: normalizeStatus(raw?.status),
    messageId: normalizeNullableString(raw?.messageId),
    errorMessage: normalizeNullableString(raw?.errorMessage),
    createdAt,
  };
}

export const firestoreOnboardingReminderHistoryStore: OnboardingReminderHistoryStore = {
  async listEntries() {
    const db = getFirebaseAdminDb();
    const snapshot = await db.collection("onboardingReminderRuns").get();

    return snapshot.docs
      .map((doc) =>
        normalizeEntry(
          doc.id,
          doc.data() as Partial<OnboardingReminderRunRecord> | undefined,
        ),
      )
      .sort((left, right) => right.runAt.localeCompare(left.runAt));
  },

  async createEntry(record) {
    const db = getFirebaseAdminDb();
    const normalized = normalizeEntry(record.id, record);
    await db.collection("onboardingReminderRuns").doc(normalized.id).set(normalized);
    return normalized;
  },
};
