import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import DashboardForm from "./dashboard-form";
import { listDailyBriefHistory } from "../../lib/daily-brief-history-store";
import { buildDailyBriefKnowledgeBank } from "../../lib/daily-brief-knowledge-bank";
import { listDailyBriefNotebookEntries } from "../../lib/daily-brief-notebook-store";
import { getProfileByEmail } from "../../lib/mvp-store";
import { buildOutboundDailyBriefPacket } from "../../lib/outbound-daily-brief-packet";
import { isNotionConfigured } from "../../lib/notion-config";
import { getSessionFromCookieStore } from "../../lib/session";

export default async function DashboardPage() {
  const session = await getSessionFromCookieStore(await cookies());
  const sessionEmail = session?.email ?? null;

  if (!sessionEmail) {
    redirect("/login");
  }

  const profile = await getProfileByEmail(sessionEmail);

  if (!profile) {
    redirect("/login");
  }

  const [latestBrief] = await listDailyBriefHistory({
    programme: profile.student.programme,
    recordKind: "production",
    status: "published",
  });
  const notebookItems = await listDailyBriefNotebookEntries({
    parentId: profile.parent.id,
    limit: 100,
  });
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

  return (
    <DashboardForm
      initialProfile={profile}
      notionConfigured={isNotionConfigured()}
      notebookItems={notebookItems}
      notebookSuggestion={notebookSuggestion}
    />
  );
}
