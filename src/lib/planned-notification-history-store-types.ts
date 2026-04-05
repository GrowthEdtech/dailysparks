import type { PlannedNotificationRunRecord } from "./planned-notification-history-schema";

export type PlannedNotificationHistoryStore = {
  listEntries(): Promise<PlannedNotificationRunRecord[]>;
  createEntry(
    record: PlannedNotificationRunRecord,
  ): Promise<PlannedNotificationRunRecord>;
};
