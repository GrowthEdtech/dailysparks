import { getDailyBriefHistoryEntry } from "../../../../lib/daily-brief-history-store";
import { buildDailyBriefKnowledgeBank } from "../../../../lib/daily-brief-knowledge-bank";
import { saveDailyBriefNotebookEntries } from "../../../../lib/daily-brief-notebook-store";
import { getProfileByEmail } from "../../../../lib/mvp-store";
import { buildOutboundDailyBriefPacket } from "../../../../lib/outbound-daily-brief-packet";
import { getSessionEmailFromRequest } from "../../../../lib/session";

type SaveNotebookRequest = {
  briefId?: string;
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

  const body = (await request.json().catch(() => null)) as SaveNotebookRequest | null;
  const briefId =
    typeof body?.briefId === "string" && body.briefId.trim()
      ? body.briefId.trim()
      : null;

  if (!briefId) {
    return Response.json(
      { message: "Please choose a brief before saving notebook entries." },
      { status: 400 },
    );
  }

  const brief = await getDailyBriefHistoryEntry(briefId);

  if (!brief || brief.recordKind !== "production") {
    return Response.json(
      { message: "We could not find a production brief for that save request." },
      { status: 404 },
    );
  }

  if (brief.status !== "published") {
    return Response.json(
      { message: "Only published briefs can be saved into the notebook." },
      { status: 409 },
    );
  }

  if (brief.programme !== profile.student.programme) {
    return Response.json(
      { message: "This brief does not match your child's current programme." },
      { status: 409 },
    );
  }

  const packet = buildOutboundDailyBriefPacket(brief);
  const knowledgeBank = buildDailyBriefKnowledgeBank(packet);
  const saveResult = await saveDailyBriefNotebookEntries({
    parentId: profile.parent.id,
    parentEmail: profile.parent.email,
    studentId: profile.student.id,
    programme: profile.student.programme,
    interestTags: profile.student.interestTags ?? [],
    briefId: brief.id,
    scheduledFor: brief.scheduledFor,
    headline: brief.headline,
    topicTags: brief.topicTags,
    knowledgeBankTitle: knowledgeBank.title,
    entries: knowledgeBank.entries,
  });

  return Response.json({
    message:
      saveResult.savedEntries.length > 0
        ? "Notebook updated."
        : "This brief was already saved to the notebook.",
    savedCount: saveResult.savedEntries.length,
    dedupedCount: saveResult.dedupedEntries.length,
    entries: [...saveResult.savedEntries, ...saveResult.dedupedEntries],
  });
}
