import { getDailyBriefHistoryEntry } from "../../../../lib/daily-brief-history-store";
import { syncNotebookEntriesToNotion } from "../../../../lib/daily-brief-notebook-notion-sync";
import {
  saveDailyBriefNotebookAuthoredEntry,
} from "../../../../lib/daily-brief-notebook-store";
import {
  isAuthoredNotebookEntryTypeAllowed,
  type DailyBriefNotebookEntryType,
} from "../../../../lib/daily-brief-notebook-schema";
import { getProfileByEmail } from "../../../../lib/mvp-store";
import { getSessionEmailFromRequest } from "../../../../lib/session";

type SaveNotebookEntryRequest = {
  briefId?: string;
  entryType?: string;
  body?: string;
};

function normalizeEntryType(value: unknown): DailyBriefNotebookEntryType | null {
  return typeof value === "string" && value.trim()
    ? (value.trim() as DailyBriefNotebookEntryType)
    : null;
}

export async function POST(request: Request) {
  const sessionEmail = await getSessionEmailFromRequest(request);

  if (!sessionEmail) {
    return Response.json({ message: "Please log in to continue." }, { status: 401 });
  }

  const profile = await getProfileByEmail(sessionEmail);

  if (!profile) {
    return Response.json({ message: "Your session has expired." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as SaveNotebookEntryRequest | null;
  const briefId =
    typeof body?.briefId === "string" && body.briefId.trim()
      ? body.briefId.trim()
      : null;
  const entryType = normalizeEntryType(body?.entryType);
  const noteBody = typeof body?.body === "string" ? body.body.trim() : "";

  if (!briefId) {
    return Response.json(
      { message: "Please choose a brief before saving a notebook reflection." },
      { status: 400 },
    );
  }

  if (!entryType) {
    return Response.json(
      { message: "Please choose a notebook section before saving." },
      { status: 400 },
    );
  }

  if (!noteBody) {
    return Response.json(
      { message: "Please add a short note before saving." },
      { status: 400 },
    );
  }

  if (!isAuthoredNotebookEntryTypeAllowed(profile.student.programme, entryType)) {
    return Response.json(
      { message: "This notebook section is not available for your child's programme." },
      { status: 409 },
    );
  }

  const brief = await getDailyBriefHistoryEntry(briefId);

  if (!brief || brief.recordKind !== "production") {
    return Response.json(
      { message: "We could not find a production brief for that notebook note." },
      { status: 404 },
    );
  }

  if (brief.status !== "published") {
    return Response.json(
      { message: "Only published briefs can be used for notebook reflections." },
      { status: 409 },
    );
  }

  if (brief.programme !== profile.student.programme) {
    return Response.json(
      { message: "This brief does not match your child's current programme." },
      { status: 409 },
    );
  }

  const saveResult = await saveDailyBriefNotebookAuthoredEntry({
    parentId: profile.parent.id,
    parentEmail: profile.parent.email,
    studentId: profile.student.id,
    programme: profile.student.programme,
    interestTags: profile.student.interestTags ?? [],
    briefId: brief.id,
    scheduledFor: brief.scheduledFor,
    headline: brief.headline,
    topicTags: brief.topicTags,
    knowledgeBankTitle:
      profile.student.programme === "DP" ? "Academic idea bank" : "Inquiry notebook",
    entryType,
    body: noteBody,
  });
  const notionSync = await syncNotebookEntriesToNotion(
    profile,
    {
      headline: brief.headline,
      summary: brief.summary,
      scheduledFor: brief.scheduledFor,
      programme: brief.programme,
      topicTags: brief.topicTags,
    },
    [
      {
        title: saveResult.entry.title,
        body: saveResult.entry.body,
      },
    ],
  );

  return Response.json({
    message: saveResult.wasUpdate ? "Notebook reflection updated." : "Notebook reflection saved.",
    wasUpdate: saveResult.wasUpdate,
    entry: saveResult.entry,
    notionSync,
  });
}
