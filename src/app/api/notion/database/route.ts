import { getProfileByEmail, updateParentNotionConnection } from "../../../../lib/mvp-store";
import { createNotionArchiveDatabase } from "../../../../lib/notion";
import { isNotionConfigured } from "../../../../lib/notion-config";
import { getSessionEmailFromRequest } from "../../../../lib/session";

type CreateDatabaseBody = {
  pageId?: unknown;
};

export async function POST(request: Request) {
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

  const body = (await request.json().catch(() => null)) as CreateDatabaseBody | null;
  const pageId = typeof body?.pageId === "string" ? body.pageId.trim() : "";

  if (!pageId) {
    return Response.json(
      { message: "Please choose a Notion page first." },
      { status: 400 },
    );
  }

  const archive = await createNotionArchiveDatabase(profile.parent.id, pageId);
  const nextProfile = await updateParentNotionConnection(sessionEmail, {
    notionDatabaseId: archive.databaseId,
    notionDatabaseName: archive.databaseName,
    notionDataSourceId: archive.dataSourceId,
    notionLastSyncStatus: "idle",
    notionLastSyncMessage: "Archive created. You can now send a test page.",
    notionConnected: true,
  });

  return Response.json(nextProfile);
}
