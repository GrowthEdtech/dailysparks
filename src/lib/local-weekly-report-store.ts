import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { WeeklyProgressReportRecord } from "./weekly-report-schema";
import type { 
  WeeklyProgressReportStore, 
  WeeklyProgressReportFilters 
} from "./weekly-report-store-types";

const DATA_DIR = join(process.cwd(), ".daily-brief-data");
const RECAP_FILE = join(DATA_DIR, "weekly_progress_reports.json");

function ensureStore() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!existsSync(RECAP_FILE)) {
    writeFileSync(RECAP_FILE, JSON.stringify([]));
  }
}

function readData(): WeeklyProgressReportRecord[] {
  ensureStore();
  const content = readFileSync(RECAP_FILE, "utf-8");
  return JSON.parse(content);
}

function writeData(data: WeeklyProgressReportRecord[]) {
  ensureStore();
  writeFileSync(RECAP_FILE, JSON.stringify(data, null, 2));
}

export const localWeeklyReportStore: WeeklyProgressReportStore = {
  async getReport(id) {
    const data = readData();
    return data.find((r) => r.id === id) ?? null;
  },

  async listReports(filters) {
    let data = readData();
    if (filters?.parentId) {
      data = data.filter((r) => r.parentId === filters.parentId);
    }
    if (filters?.studentId) {
      data = data.filter((r) => r.studentId === filters.studentId);
    }
    if (filters?.weekKey) {
      data = data.filter((r) => r.weekKey === filters.weekKey);
    }
    return data.slice(0, filters?.limit);
  },

  async upsertReport(record) {
    const data = readData();
    const index = data.findIndex((r) => r.id === record.id);
    if (index >= 0) {
      data[index] = record;
    } else {
      data.push(record);
    }
    writeData(data);
    return record;
  },

  async deleteReport(id) {
    const data = readData();
    const filtered = data.filter((r) => r.id !== id);
    writeData(filtered);
  },
};
