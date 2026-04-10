import type { ParentProfile } from "./mvp-types";
import { listDailyBriefHistory } from "./daily-brief-history-store";
import { buildDailyBriefKnowledgeBank } from "./daily-brief-knowledge-bank";
import { listDailyBriefNotebookEntries } from "./daily-brief-notebook-store";
import { listDailyBriefNotebookWeeklyRecaps } from "./daily-brief-notebook-weekly-recap-store";
import { buildOutboundDailyBriefPacket } from "./outbound-daily-brief-packet";
import type { DashboardNotebookData } from "./dashboard-notebook-data-schema";

export async function buildDashboardNotebookData(
  profile: ParentProfile,
): Promise<DashboardNotebookData> {
  const [latestBrief] = await listDailyBriefHistory({
    programme: profile.student.programme,
    recordKind: "production",
    status: "published",
  });
  const [notebookItems, weeklyRecapHistory] = await Promise.all([
    listDailyBriefNotebookEntries({
      parentId: profile.parent.id,
      limit: 100,
    }),
    listDailyBriefNotebookWeeklyRecaps({
      parentId: profile.parent.id,
      programme: profile.student.programme,
      limit: 12,
    }),
  ]);

  const notebookSuggestion = latestBrief
    ? (() => {
        const packet = buildOutboundDailyBriefPacket(latestBrief);
        const knowledgeBank = buildDailyBriefKnowledgeBank(packet);

        return {
          briefId: latestBrief.id,
          scheduledFor: latestBrief.scheduledFor,
          headline: latestBrief.headline,
          knowledgeBankTitle: knowledgeBank.title,
          entries: knowledgeBank.entries,
        };
      })()
    : null;

  return {
    notebookItems,
    weeklyRecapRecord: weeklyRecapHistory[0] ?? null,
    weeklyRecapHistory,
    notebookSuggestion,
  };
}
