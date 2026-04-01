import { getSessionEmailFromRequest } from "../../../../lib/session";
import { buildNotionAuthorizeUrl } from "../../../../lib/notion";
import { createNotionStateCookieHeader, createNotionStateValue } from "../../../../lib/notion-state";
import { isNotionConfigured } from "../../../../lib/notion-config";

function serviceUnavailable() {
  return Response.json(
    {
      message: "Notion sync is not configured yet.",
    },
    { status: 503 },
  );
}

export async function POST(request: Request) {
  if (!isNotionConfigured()) {
    return serviceUnavailable();
  }

  const sessionEmail = await getSessionEmailFromRequest(request);

  if (!sessionEmail) {
    return Response.json({ message: "Please log in to continue." }, { status: 401 });
  }

  const state = createNotionStateValue();

  return Response.json(
    {
      authorizationUrl: buildNotionAuthorizeUrl(state),
    },
    {
      headers: {
        "Set-Cookie": createNotionStateCookieHeader(state),
      },
    },
  );
}
