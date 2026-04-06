import { firestoreOperationsHealthRunStore } from "./firestore-operations-health-run-store";
import type { OperationsHealthRunRecord } from "./operations-health-run-schema";
import { localOperationsHealthRunStore } from "./local-operations-health-run-store";
import type { OperationsHealthRunStore } from "./operations-health-run-store-types";
import {
  getProfileStoreBackend,
  validateProfileStoreConfig,
} from "./profile-store-config";

function getOperationsHealthRunStore(): OperationsHealthRunStore {
  validateProfileStoreConfig();

  return getProfileStoreBackend() === "firestore"
    ? firestoreOperationsHealthRunStore
    : localOperationsHealthRunStore;
}

export async function listOperationsHealthRuns() {
  const runs = await getOperationsHealthRunStore().listRuns();

  return [...runs].sort((left, right) =>
    right.startedAt.localeCompare(left.startedAt),
  );
}

export async function createOperationsHealthRun(record: OperationsHealthRunRecord) {
  return getOperationsHealthRunStore().createRun(record);
}
