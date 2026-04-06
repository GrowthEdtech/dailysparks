import type { OperationsHealthRunRecord } from "./operations-health-run-schema";

export type OperationsHealthRunStore = {
  listRuns(): Promise<OperationsHealthRunRecord[]>;
  createRun(record: OperationsHealthRunRecord): Promise<OperationsHealthRunRecord>;
};
