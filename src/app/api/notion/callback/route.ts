import { getProfileByEmail, updateParentNotionConnection } from "../../../../lib/mvp-store";
import { exchangeNotionCode } from "../../../../lib/notion";
import { isNotionConfigured } from "../../../../lib/notion-config";
import { clearNotionStateCookieHeader, getNotionStateCookieValue } from "../../../../lib/notion-state";
import { getRequestOrigin } from "../../../../lib/request-origin";
import { getSessionEmailFromRequest } from "../../../../lib/session";

function redirectToDashboard(request: Request, status: string) {
  const url = new URL("/dashboard", getRequestOrigin(request));
  url.searchParams.set("notion", status);

  return Response.redirect(url, 302);
}

function redirectToDashboardWithCookie(
  request: Request,
  status: string,
  cookieHeader: string,
) {
  const url = new URL("/dashboard", getRequestOrigin(request));
  url.searchParams.set("notion", status);

  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      "Set-Cookie": cookieHeader,
    },
  });
}

export async function GET(request: Request) {
  if (!isNotionConfigured()) {
    return redirectToDashboard(request, "unavailable");
  }

  const sessionEmail = await getSessionEmailFromRequest(request);

  if (!sessionEmail) {
    return redirectToDashboard(request, "unauthorized");
  }

  const url = new URL(request.url);
  const state = url.searchParams.get("state")?.trim() ?? "";
  const code = url.searchParams.get("code")?.trim() ?? "";
  const error = url.searchParams.get("error")?.trim() ?? "";
  const cookieState = getNotionStateCookieValue(request);

  if (error || !code || !state || !cookieState || state !== cookieState) {
    return redirectToDashboardWithCookie(
      request,
      "error",
      clearNotionStateCookieHeader(),
    );
  }

  const profile = await getProfileByEmail(sessionEmail);

  if (!profile) {
    return redirectToDashboardWithCookie(
      request,
      "unauthorized",
      clearNotionStateCookieHeader(),
    );
  }

  try {
    const connection = await exchangeNotionCode(code, profile.parent.id);

    await updateParentNotionConnection(sessionEmail, {
      notionWorkspaceId: connection.workspaceId,
      notionWorkspaceName: connection.workspaceName,
      notionBotId: connection.botId,
      notionDatabaseId: null,
      notionDatabaseName: null,
      notionDataSourceId: null,
      notionAuthorizedAt: new Date().toISOString(),
      notionLastSyncStatus: "idle",
      notionLastSyncMessage: "Notion connected. Choose a parent page to create your archive.",
      notionConnected: false,
    });

    return redirectToDashboardWithCookie(
      request,
      "connected",
      clearNotionStateCookieHeader(),
    );
  } catch (routeError) {
    console.error("notion callback failed", routeError);
    return redirectToDashboardWithCookie(
      request,
      "error",
      clearNotionStateCookieHeader(),
    );
  }
}
