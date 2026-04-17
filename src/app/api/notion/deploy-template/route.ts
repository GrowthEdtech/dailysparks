import { getSessionEmailFromRequest } from "../../../../lib/session";
import { getProfileByEmail, updateParentNotionConnection } from "../../../../lib/mvp-store";
import { getNotionConnectionSecret } from "../../../../lib/notion-connection-store";
import { decryptNotionToken } from "../../../../lib/notion-crypto";
import { deployStandardIbTemplate } from "../../../../lib/notion-template-factory";

export async function POST(request: Request) {
  const sessionEmail = await getSessionEmailFromRequest(request);

  if (!sessionEmail) {
    return Response.json({ message: "Please log in to continue." }, { status: 401 });
  }

  const { pageId } = (await request.json().catch(() => ({}))) as { pageId?: string };

  if (!pageId) {
    return Response.json({ message: "Please provide a parent page ID." }, { status: 400 });
  }

  try {
    const profile = await getProfileByEmail(sessionEmail);

    if (!profile) {
      return Response.json({ message: "Profile not found." }, { status: 404 });
    }

    const connection = await getNotionConnectionSecret(profile.parent.id);

    if (!connection) {
      return Response.json({ message: "Notion is not connected." }, { status: 400 });
    }

    const accessToken = await decryptNotionToken(connection.accessTokenCiphertext);

    if (!accessToken) {
      return Response.json({ message: "Invalid Notion connection." }, { status: 400 });
    }

    // Deploy the template
    const result = await deployStandardIbTemplate(pageId, accessToken);

    // Update the profile with the new dashboard as the "Archive"
    const updatedProfile = await updateParentNotionConnection(sessionEmail, {
      notionDatabaseId: result.dashboardPageId,
      notionDatabaseName: "IB DP Ultimate Dashboard",
      notionLastSyncPageId: result.dashboardPageId,
      notionLastSyncPageUrl: result.dashboardUrl,
    });

    if (!updatedProfile) {
       return Response.json({ message: "Failed to update profile." }, { status: 500 });
    }

    return Response.json({
      message: "IB DP Workspace initialized successfully!",
      parent: updatedProfile.parent,
      student: updatedProfile.student,
    });
  } catch (error) {
    console.error("Notion deployment failed:", error);
    return Response.json(
      { message: error instanceof Error ? error.message : "Failed to initialize IB workspace." },
      { status: 500 },
    );
  }
}
