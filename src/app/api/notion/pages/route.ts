import { getProfileByEmail } from "../../../../lib/mvp-store";
import { isNotionConfigured } from "../../../../lib/notion-config";
import { listNotionParentPages } from "../../../../lib/notion";
import { getSessionEmailFromRequest } from "../../../../lib/session";

export async function GET(request: Request) {
  if (!isNotionConfigured()) {
    return Response.json(
      { message: "Notion sync is not configured yet." },
      { status: 503 },
    );
  }

  const sessionEmail = await getSessionEmailFromRequest(request);

  if (!sessionEmail) {
    return Response.json({ message: "Please log in to continue." }, { status: 401 });
  }

  const profile = await getProfileByEmail(sessionEmail);

  if (!profile) {
    return Response.json({ message: "Your session has expired." }, { status: 401 });
  }

  const pages = await listNotionParentPages(profile.parent.id);

  return Response.json({ pages });
}
