import { firestoreOnboardingReminderHistoryStore } from "./firestore-onboarding-reminder-history-store";
import { localOnboardingReminderHistoryStore } from "./local-onboarding-reminder-history-store";
import type { OnboardingReminderRunRecord } from "./onboarding-reminder-history-schema";
import type { OnboardingReminderHistoryStore } from "./onboarding-reminder-history-store-types";
import {
  getProfileStoreBackend,
  validateProfileStoreConfig,
} from "./profile-store-config";

type CreateOnboardingReminderRunEntryInput = Omit<
  OnboardingReminderRunRecord,
  "id" | "runDate" | "createdAt"
>;

function getOnboardingReminderHistoryStore(): OnboardingReminderHistoryStore {
  validateProfileStoreConfig();

  return getProfileStoreBackend() === "firestore"
    ? firestoreOnboardingReminderHistoryStore
    : localOnboardingReminderHistoryStore;
}

export async function listOnboardingReminderRunHistory() {
  return getOnboardingReminderHistoryStore().listEntries();
}

export async function createOnboardingReminderRunEntry(
  input: CreateOnboardingReminderRunEntryInput,
) {
  const timestamp = new Date().toISOString();
  const record: OnboardingReminderRunRecord = {
    id: crypto.randomUUID(),
    runAt: input.runAt.trim(),
    runDate: input.runAt.trim().slice(0, 10),
    parentId: input.parentId.trim(),
    parentEmail: input.parentEmail.trim(),
    stageIndex: input.stageIndex,
    stageLabel: input.stageLabel.trim(),
    status: input.status,
    messageId: input.messageId?.trim() || null,
    errorMessage: input.errorMessage?.trim() || null,
    createdAt: timestamp,
  };

  return getOnboardingReminderHistoryStore().createEntry(record);
}
