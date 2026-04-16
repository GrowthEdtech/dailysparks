import { getFirebaseAdminDb } from "./firebase-admin";
import type { WeeklyProgressReportRecord } from "./weekly-report-schema";
import type { 
  WeeklyProgressReportStore, 
  WeeklyProgressReportFilters 
} from "./weekly-report-store-types";

function normalizeRecord(id: string, raw: any): WeeklyProgressReportRecord {
  return {
    id,
    parentId: raw.parentId ?? "",
    parentEmail: raw.parentEmail ?? "",
    studentId: raw.studentId ?? "",
    studentName: raw.studentName ?? "",
    programme: raw.programme ?? "PYP",
    weekKey: raw.weekKey ?? "",
    weekRangeLabel: raw.weekRangeLabel ?? "",
    interactionStats: {
      totalBriefsSent: raw.interactionStats?.totalBriefsSent ?? 0,
      totalChallengesFound: raw.interactionStats?.totalChallengesFound ?? 0,
      completedChallenges: raw.interactionStats?.completedChallenges ?? 0,
      interactionRate: raw.interactionStats?.interactionRate ?? 0,
    },
    reportContent: {
      executiveSummary: raw.reportContent?.executiveSummary ?? "",
      conceptMastery: raw.reportContent?.conceptMastery ?? [],
      vocabularyHighlights: raw.reportContent?.vocabularyHighlights ?? [],
      thinkingSkillsGrowth: raw.reportContent?.thinkingSkillsGrowth ?? "",
      weekendDiscussionPrompts: raw.reportContent?.weekendDiscussionPrompts ?? [],
    },
    deliveredAt: raw.deliveredAt ?? null,
    status: raw.status ?? "generated",
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

export const firestoreWeeklyReportStore: WeeklyProgressReportStore = {
  async getReport(id) {
    const doc = await getFirebaseAdminDb().collection("weeklyProgressReports").doc(id).get();
    if (!doc.exists) return null;
    return normalizeRecord(doc.id, doc.data());
  },

  async listReports(filters) {
    let query: any = getFirebaseAdminDb().collection("weeklyProgressReports");

    if (filters?.parentId) query = query.where("parentId", "==", filters.parentId);
    if (filters?.studentId) query = query.where("studentId", "==", filters.studentId);
    if (filters?.weekKey) query = query.where("weekKey", "==", filters.weekKey);
    
    if (filters?.limit) query = query.limit(filters.limit);

    const snapshot = await query.get();
    return snapshot.docs.map((doc: any) => normalizeRecord(doc.id, doc.data()));
  },

  async upsertReport(record) {
    const timestamp = new Date().toISOString();
    const data = {
      ...record,
      updatedAt: timestamp,
    };
    await getFirebaseAdminDb().collection("weeklyProgressReports").doc(record.id).set(data, { merge: true });
    return normalizeRecord(record.id, data);
  },

  async deleteReport(id) {
    await getFirebaseAdminDb().collection("weeklyProgressReports").doc(id).delete();
  },
};
