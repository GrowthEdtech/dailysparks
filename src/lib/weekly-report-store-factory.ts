import { getProfileStoreBackend, validateProfileStoreConfig } from "./profile-store-config";
import { localWeeklyReportStore } from "./local-weekly-report-store";
import { firestoreWeeklyReportStore } from "./firestore-weekly-report-store";
import type { WeeklyProgressReportStore } from "./weekly-report-store-types";

export function getWeeklyReportStore(): WeeklyProgressReportStore {
  validateProfileStoreConfig();
  
  return getProfileStoreBackend() === "firestore"
    ? firestoreWeeklyReportStore
    : localWeeklyReportStore;
}
