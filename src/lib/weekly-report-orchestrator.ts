import { listDailyBriefHistory } from "./daily-brief-history-store";
import { fetchNotionPageInteractions } from "./notion";
import { getProfileStore } from "./profile-store-factory";
import { generateOpenAiCompatibleText } from "./ai-runtime";
import { getDefaultAiConnectionWithSecret } from "./ai-connection-store";
import type { WeeklyProgressReportRecord, WeeklyProgressReportContent } from "./weekly-report-schema";
import { localWeeklyReportStore } from "./local-weekly-report-store";
import type { ParentProfile } from "./mvp-types";

export type WeeklyReportOrchestrationResult = {
  report: WeeklyProgressReportRecord;
  historyCount: number;
};

export async function generateWeeklyProgressReport(
  profile: ParentProfile,
  asOf: string = new Date().toISOString()
): Promise<WeeklyReportOrchestrationResult> {
  const anchorDate = new Date(asOf);
  const sevenDaysAgo = new Date(anchorDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // 1. Fetch relevant history entries
  const allHistory = await listDailyBriefHistory({ status: "published" });
  const studentHistory = allHistory.filter(entry => 
    entry.deliveryReceipts.some(r => r.parentId === profile.parent.id) &&
    new Date(entry.scheduledFor) >= sevenDaysAgo &&
    new Date(entry.scheduledFor) <= anchorDate
  );

  // 2. Fetch Notion interactions
  let completedTasks = 0;
  let totalTasks = 0;
  
  for (const entry of studentHistory) {
    const receipt = entry.deliveryReceipts.find(r => r.parentId === profile.parent.id);
    if (receipt?.externalId) {
      try {
        const stats = await fetchNotionPageInteractions(profile.parent.id, receipt.externalId);
        completedTasks += stats.completedTasks;
        totalTasks += stats.totalTasks;
      } catch (error) {
        console.error(`Failed to fetch interactions for page ${receipt.externalId}:`, error);
      }
    }
  }

  // 3. AI Summarization (English)
  const connection = await getDefaultAiConnectionWithSecret();
  if (!connection) throw new Error("No default AI connection configured.");

  const historySummary = studentHistory.map(h => `- ${h.headline}: ${h.summary}`).join("\n");
  
  const aiPrompt = `
You are an expert academic advisor for IB students (MYP/DP). 
Generate a professional "Weekly Progress Report" for a parent based on their child's daily reading history.

Student: ${profile.student.studentName}
Programme: ${profile.student.programme} Year ${profile.student.programmeYear}

Daily Briefs Covered this Week:
${historySummary}

Interaction Stats:
- Total Challenges Presented: ${totalTasks}
- Challenges Completed: ${completedTasks}

TASK:
Provide a structured report in English with the following JSON format:
{
  "executiveSummary": "A 2-3 sentence overview of the academic focus and student engagement.",
  "conceptMastery": ["Concept 1", "Concept 2"],
  "vocabularyHighlights": [
    { "term": "Term 1", "context": "Brief context of use" }
  ],
  "thinkingSkillsGrowth": "Analysis of the student's progress in critical thinking and inquiry.",
  "weekendDiscussionPrompts": ["Question 1", "Question 2"]
}

Rules:
1. Always respond in English.
2. Be professional, encouraging, and academically rigorous.
3. Focus on growth and curiosity.
`;

  const aiResult = await generateOpenAiCompatibleText({
    connection,
    developerPrompt: "You are a professional academic advisor. Output JSON only.",
    userPrompt: aiPrompt
  });

  const reportContent: WeeklyProgressReportContent = JSON.parse(aiResult.text);

  // 4. Create Record
  const weekKey = `${anchorDate.getUTCFullYear()}-W${getWeekNumber(anchorDate)}`;
  const report: WeeklyProgressReportRecord = {
    id: crypto.randomUUID(),
    parentId: profile.parent.id,
    parentEmail: profile.parent.email,
    studentId: profile.student.id,
    studentName: profile.student.studentName,
    programme: profile.student.programme,
    weekKey,
    weekRangeLabel: `${sevenDaysAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${anchorDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    interactionStats: {
      totalBriefsSent: studentHistory.length,
      totalChallengesFound: totalTasks,
      completedChallenges: completedTasks,
      interactionRate: totalTasks > 0 ? (completedTasks / totalTasks) : 0
    },
    reportContent,
    deliveredAt: null,
    status: "generated",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await localWeeklyReportStore.upsertReport(report);

  return { report, historyCount: studentHistory.length };
}

function getWeekNumber(d: Date): number {
  d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
