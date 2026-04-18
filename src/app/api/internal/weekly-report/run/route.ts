import { NextResponse } from "next/server";
import { listParentProfiles } from "../../../../../lib/mvp-store";
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

  const profiles = await listParentProfiles();
  const results = [];

  for (const profile of profiles) {
    const { parent, student } = profile;

    try {
      const { report } = await generateWeeklyProgressReport(profile);
      const delivery = await sendWeeklyProgressReportEmail(profile, report);

      // Update report status
      await localWeeklyReportStore.upsertReport({
        ...report,
        deliveredAt: new Date().toISOString(),
        status: "delivered",
      });

      results.push({
        parent: parent.email,
        status: "success",
        messageId: delivery.messageId,
      });
    } catch (error) {
      console.error(`Failed to process weekly report for ${parent.email}:`, error);

      await emitDailyBriefOpsAlert({
        stage: "weekly-report",
        severity: "warning",
        runDate: new Date().toISOString().split("T")[0],
        title: `Weekly Report Failed: ${parent.email}`,
        message: (error as Error).message,
        details: { parentEmail: parent.email },
      });

      results.push({
        parent: parent.email,
        status: "failed",
        error: (error as Error).message,
      });
    }
  }

  return NextResponse.json({
    summary: {
      total: profiles.length,
      success: results.filter((result) => result.status === "success").length,
      failed: results.filter((result) => result.status === "failed").length,
    },
    details: results,
  });
}
