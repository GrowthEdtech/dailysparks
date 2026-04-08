import { listDailyBriefNotebookEntries } from "../../../../../lib/daily-brief-notebook-store";
import {
  buildDailyBriefNotebookWeeklyRecap,
} from "../../../../../lib/daily-brief-notebook-weekly-recap";
import {
  getDailyBriefNotebookWeeklyRecap,
  saveDailyBriefNotebookWeeklyRecap,
  saveDailyBriefNotebookWeeklyRecapResponse,
} from "../../../../../lib/daily-brief-notebook-weekly-recap-store";
import { getProfileByEmail } from "../../../../../lib/mvp-store";
import { getSessionEmailFromRequest } from "../../../../../lib/session";

type SaveWeeklyRecapResponseRequest = {
  asOf?: string;
  weekKey?: string;
  promptEntryId?: string;
  response?: string;
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

  const body =
    (await request.json().catch(() => null)) as SaveWeeklyRecapResponseRequest | null;
  const promptEntryId =
    typeof body?.promptEntryId === "string" && body.promptEntryId.trim()
      ? body.promptEntryId.trim()
      : null;
  const responseText =
    typeof body?.response === "string" ? body.response.trim() : "";

  if (!promptEntryId) {
    return Response.json(
      { message: "Choose a retrieval prompt before saving your response." },
      { status: 400 },
    );
  }

  if (!responseText) {
    return Response.json(
      { message: "Add a short response before saving." },
      { status: 400 },
    );
  }

  const normalizedWeekKey =
    typeof body?.weekKey === "string" && body.weekKey.trim() ? body.weekKey.trim() : null;
  let weeklyRecapRecord = normalizedWeekKey
    ? await getDailyBriefNotebookWeeklyRecap({
        parentId: profile.parent.id,
        programme: profile.student.programme,
        weekKey: normalizedWeekKey,
      })
    : null;

  if (!weeklyRecapRecord) {
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
        { message: "Save at least one notebook entry this week before saving a response." },
        { status: 409 },
      );
    }

    weeklyRecapRecord = (
      await saveDailyBriefNotebookWeeklyRecap({
        parentId: profile.parent.id,
        parentEmail: profile.parent.email,
        studentId: profile.student.id,
        programme: profile.student.programme,
        recap,
      })
    ).record;
  }

  const saveResult = await saveDailyBriefNotebookWeeklyRecapResponse({
    parentId: profile.parent.id,
    programme: profile.student.programme,
    weekKey: weeklyRecapRecord.weekKey,
    promptEntryId,
    response: responseText,
  });

  return Response.json({
    message: saveResult.response.wasUpdate
      ? "Retrieval response updated."
      : "Retrieval response saved.",
    wasUpdate: saveResult.response.wasUpdate,
    record: saveResult.record,
  });
}
