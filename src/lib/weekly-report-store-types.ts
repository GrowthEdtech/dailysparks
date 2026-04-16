import type { WeeklyProgressReportRecord } from "./weekly-report-schema";

export type WeeklyProgressReportFilters = {
  parentId?: string;
  studentId?: string;
  programme?: string;
  weekKey?: string;
  limit?: number;
};

export type WeeklyProgressReportStore = {
  getReport(id: string): Promise<WeeklyProgressReportRecord | null>;
  listReports(filters?: WeeklyProgressReportFilters): Promise<WeeklyProgressReportRecord[]>;
  upsertReport(record: WeeklyProgressReportRecord): Promise<WeeklyProgressReportRecord>;
  deleteReport(id: string): Promise<void>;
};
