import {
  getDailyBriefNotebookWeeklyRecap,
} from "../../../../../lib/daily-brief-notebook-weekly-recap-store";
import {
  deliverNotebookWeeklyRecapForProfile,
} from "../../../../../lib/daily-brief-notebook-weekly-recap-delivery";
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
  const result = await deliverNotebookWeeklyRecapForProfile({
    profile,
    asOf: body?.asOf,
    source: "manual",
    syncNotion: true,
    sendEmail: false,
  });

  if (result.status === "skipped") {
    return Response.json(
      { message: "Save at least one notebook entry this week before syncing a recap." },
      { status: 409 },
    );
  }

  const refreshedRecap =
    (await getDailyBriefNotebookWeeklyRecap({
      parentId: profile.parent.id,
      programme: profile.student.programme,
      weekKey: result.record.weekKey,
    })) ?? result.record;

  return Response.json({
    message:
      result.notionSync?.status === "synced"
        ? "Weekly recap synced to Notion."
        : result.notionSync?.message ?? "Weekly recap is ready.",
    recap: refreshedRecap,
    notionSync: result.notionSync,
  });
}
