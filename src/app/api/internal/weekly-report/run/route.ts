import { NextResponse } from "next/server";
import { getProfileByEmail as getProfileStore } from "../../../../../lib/mvp-store";
import { generateWeeklyProgressReport } from "../../../../../lib/weekly-report-orchestrator";
import { sendWeeklyProgressReportEmail } from "../../../../../lib/weekly-report-delivery";
import { localWeeklyReportStore } from "../../../../../lib/local-weekly-report-store";
import { emitDailyBriefOpsAlert } from "../../../../../lib/daily-brief-ops-alerts";

const SCHEDULER_SECRET = process.env.DAILY_BRIEF_SCHEDULER_SECRET;

export async function POST(request: Request) {
  const authHeader = request.headers.get("x-daily-brief-scheduler-secret");
  if (authHeader !== SCHEDULER_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = getProfileStore();
  const parents = await store.listParents();
  const results = [];

  for (const parent of parents) {
    try {
      const student = await store.getStudentByParentId(parent.id);
      if (!student) continue;

      const profile = { parent, student };
      const { report } = await generateWeeklyProgressReport(profile);
      const delivery = await sendWeeklyProgressReportEmail(profile, report);

      // Update report status
      await localWeeklyReportStore.upsertReport({
        ...report,
        deliveredAt: new Date().toISOString(),
        status: "delivered"
      });

      results.push({ parent: parent.email, status: "success", messageId: delivery.messageId });
    } catch (error) {
      console.error(`Failed to process weekly report for ${parent.email}:`, error);
      
      await emitDailyBriefOpsAlert({
        stage: "weekly-report",
        severity: "warning",
        runDate: new Date().toISOString().split("T")[0],
        title: `Weekly Report Failed: ${parent.email}`,
        message: (error as Error).message,
        details: { parentEmail: parent.email }
      });

      results.push({ parent: parent.email, status: "failed", error: (error as Error).message });
    }
  }

  return NextResponse.json({
    summary: {
      total: parents.length,
      success: results.filter(r => r.status === "success").length,
      failed: results.filter(r => r.status === "failed").length
    },
    details: results
  });
}
