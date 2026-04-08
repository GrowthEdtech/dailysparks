import { listDailyBriefNotebookEntries } from "../../../../../lib/daily-brief-notebook-store";
import {
  buildDailyBriefNotebookWeeklyRecap,
} from "../../../../../lib/daily-brief-notebook-weekly-recap";
import {
  saveDailyBriefNotebookWeeklyRecap,
} from "../../../../../lib/daily-brief-notebook-weekly-recap-store";
import { getProfileByEmail } from "../../../../../lib/mvp-store";
import { getSessionEmailFromRequest } from "../../../../../lib/session";

type SaveWeeklyRecapRequest = {
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

  const body = (await request.json().catch(() => null)) as SaveWeeklyRecapRequest | null;
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
      { message: "Save at least one notebook entry this week before saving a recap." },
      { status: 409 },
    );
  }

  const saveResult = await saveDailyBriefNotebookWeeklyRecap({
    parentId: profile.parent.id,
    parentEmail: profile.parent.email,
    studentId: profile.student.id,
    programme: profile.student.programme,
    recap,
  });

  return Response.json({
    message: saveResult.wasUpdate ? "Weekly recap refreshed." : "Weekly recap saved.",
    wasUpdate: saveResult.wasUpdate,
    record: saveResult.record,
  });
}
