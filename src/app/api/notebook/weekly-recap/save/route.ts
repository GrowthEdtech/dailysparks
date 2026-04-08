import {
  deliverNotebookWeeklyRecapForProfile,
} from "../../../../../lib/daily-brief-notebook-weekly-recap-delivery";
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
  const result = await deliverNotebookWeeklyRecapForProfile({
    profile,
    asOf: body?.asOf,
    source: "manual",
    syncNotion: false,
    sendEmail: false,
  });

  if (result.status === "skipped") {
    return Response.json(
      { message: "Save at least one notebook entry this week before saving a recap." },
      { status: 409 },
    );
  }

  return Response.json({
    message: result.wasUpdate ? "Weekly recap refreshed." : "Weekly recap saved.",
    wasUpdate: result.wasUpdate,
    record: result.record,
  });
}
