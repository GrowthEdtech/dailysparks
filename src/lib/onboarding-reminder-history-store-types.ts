import type { OnboardingReminderRunRecord } from "./onboarding-reminder-history-schema";

export type OnboardingReminderHistoryStore = {
  listEntries(): Promise<OnboardingReminderRunRecord[]>;
  createEntry(
    record: OnboardingReminderRunRecord,
  ): Promise<OnboardingReminderRunRecord>;
};
