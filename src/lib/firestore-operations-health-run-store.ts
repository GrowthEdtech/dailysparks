import { getFirebaseAdminDb } from "./firebase-admin";
import type {
  OperationsHealthRunRecord,
} from "./operations-health-run-schema";
import type { OperationsHealthRunStore } from "./operations-health-run-store-types";

export const firestoreOperationsHealthRunStore: OperationsHealthRunStore = {
  async listRuns() {
    const snapshot = await getFirebaseAdminDb()
      .collection("operationsHealthRuns")
      .get();

    return snapshot.docs.map(
      (document) => document.data() as OperationsHealthRunRecord,
    );
  },

  async createRun(record) {
    await getFirebaseAdminDb()
      .collection("operationsHealthRuns")
      .doc(record.id)
      .set(record);

    return record;
  },
};
