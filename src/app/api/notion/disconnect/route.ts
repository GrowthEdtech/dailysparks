import { getProfileByEmail, updateParentNotionConnection } from "../../../../lib/mvp-store";
import { removeNotionConnection } from "../../../../lib/notion";
import { getSessionEmailFromRequest } from "../../../../lib/session";

export async function POST(request: Request) {
  const sessionEmail = await getSessionEmailFromRequest(request);

  if (!sessionEmail) {
    return Response.json({ message: "Please log in to continue." }, { status: 401 });
  }

  const profile = await getProfileByEmail(sessionEmail);

  if (!profile) {
    return Response.json({ message: "Your session has expired." }, { status: 401 });
  }

  await removeNotionConnection(profile.parent.id);
  const nextProfile = await updateParentNotionConnection(sessionEmail, {
    notionWorkspaceId: null,
    notionWorkspaceName: null,
    notionBotId: null,
    notionDatabaseId: null,
    notionDatabaseName: null,
    notionDataSourceId: null,
    notionAuthorizedAt: null,
    notionLastSyncedAt: null,
    notionLastSyncStatus: null,
    notionLastSyncMessage: null,
    notionLastSyncPageId: null,
    notionLastSyncPageUrl: null,
    notionConnected: false,
  });

  return Response.json(nextProfile);
}
