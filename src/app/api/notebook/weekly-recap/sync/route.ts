import { listDailyBriefNotebookEntries } from "../../../../../lib/daily-brief-notebook-store";
import {
  buildDailyBriefNotebookWeeklyRecap,
} from "../../../../../lib/daily-brief-notebook-weekly-recap";
import {
  getDailyBriefNotebookWeeklyRecap,
  saveDailyBriefNotebookWeeklyRecap,
  updateDailyBriefNotebookWeeklyRecapNotionSync,
} from "../../../../../lib/daily-brief-notebook-weekly-recap-store";
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

  const persistedRecap = (
    await saveDailyBriefNotebookWeeklyRecap({
      parentId: profile.parent.id,
      parentEmail: profile.parent.email,
      studentId: profile.student.id,
      programme: profile.student.programme,
      recap,
    })
  ).record;
  const notionSync = await syncNotebookWeeklyRecapToNotion(profile, persistedRecap);

  if (notionSync.status === "synced") {
    await updateDailyBriefNotebookWeeklyRecapNotionSync({
      parentId: profile.parent.id,
      programme: profile.student.programme,
      weekKey: persistedRecap.weekKey,
      notionLastSyncedAt: new Date().toISOString(),
      notionLastSyncPageId: notionSync.pageId,
      notionLastSyncPageUrl: notionSync.pageUrl,
    });
  }

  const refreshedRecap =
    (await getDailyBriefNotebookWeeklyRecap({
      parentId: profile.parent.id,
      programme: profile.student.programme,
      weekKey: persistedRecap.weekKey,
    })) ?? persistedRecap;

  return Response.json({
    message:
      notionSync.status === "synced"
        ? "Weekly recap synced to Notion."
        : notionSync.message,
    recap: refreshedRecap,
    notionSync,
  });
}
