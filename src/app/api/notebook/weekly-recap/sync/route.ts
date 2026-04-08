import { listDailyBriefNotebookEntries } from "../../../../../lib/daily-brief-notebook-store";
import {
  buildDailyBriefNotebookWeeklyRecap,
} from "../../../../../lib/daily-brief-notebook-weekly-recap";
import {
  syncNotebookWeeklyRecapToNotion,
} from "../../../../../lib/daily-brief-notebook-notion-sync";
import { getProfileByEmail } from "../../../../../lib/mvp-store";
import { getSessionEmailFromRequest } from "../../../../../lib/session";

type SyncWeeklyRecapRequest = {
  asOf?: string;
};

export async function POST(request: Request) {
  const sessionEmail = await getSessionEmailFromRequest(request);

  if (!sessionEmail) {
    return Response.json({ message: "Please log in to continue." }, { status: 401 });
  }

  const profile = await getProfileByEmail(sessionEmail);

  if (!profile) {
    return Response.json({ message: "Your session has expired." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as SyncWeeklyRecapRequest | null;
  const entries = await listDailyBriefNotebookEntries({
    parentId: profile.parent.id,
    programme: profile.student.programme,
    limit: 200,
  });
  const recap = buildDailyBriefNotebookWeeklyRecap({
    entries,
    programme: profile.student.programme,
    asOf: body?.asOf,
  });

  if (!recap) {
    return Response.json(
      { message: "Save at least one notebook entry this week before syncing a recap." },
      { status: 409 },
    );
  }

  const notionSync = await syncNotebookWeeklyRecapToNotion(profile, recap);

  return Response.json({
    message:
      notionSync.status === "synced"
        ? "Weekly recap synced to Notion."
        : notionSync.message,
    recap,
    notionSync,
  });
}
