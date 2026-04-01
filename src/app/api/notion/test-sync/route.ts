import { getProfileByEmail, updateParentNotionConnection } from "../../../../lib/mvp-store";
import { createNotionTestPage } from "../../../../lib/notion";
import { isNotionConfigured } from "../../../../lib/notion-config";
import { getSessionEmailFromRequest } from "../../../../lib/session";

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

  try {
    const syncResult = await createNotionTestPage(profile);
    const nextProfile = await updateParentNotionConnection(sessionEmail, {
      notionLastSyncedAt: new Date().toISOString(),
      notionLastSyncStatus: "success",
      notionLastSyncMessage: "Test page sent to Notion successfully.",
      notionLastSyncPageId: syncResult.pageId,
      notionLastSyncPageUrl: syncResult.pageUrl,
      notionConnected: true,
    });

    return Response.json(nextProfile);
  } catch (routeError) {
    console.error("notion test sync failed", routeError);

    const nextProfile = await updateParentNotionConnection(sessionEmail, {
      notionLastSyncedAt: new Date().toISOString(),
      notionLastSyncStatus: "failed",
      notionLastSyncMessage:
        routeError instanceof Error
          ? routeError.message
          : "Notion sync failed. Please try again.",
      notionConnected: true,
    });

    return Response.json(nextProfile, { status: 502 });
  }
}
