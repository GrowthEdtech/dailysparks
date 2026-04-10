import { clearSessionCookieHeader, getSessionEmailFromRequest } from "../../../../lib/session";
import { getProfileByEmail } from "../../../../lib/mvp-store";
import { buildDashboardNotebookData } from "../../../../lib/dashboard-notebook-data";

function unauthorized(message: string) {
  return Response.json(
    { message },
    {
      status: 401,
      headers: {
        "Set-Cookie": clearSessionCookieHeader(),
      },
    },
  );
}

export async function GET(request: Request) {
  const sessionEmail = await getSessionEmailFromRequest(request);

  if (!sessionEmail) {
    return unauthorized("Please log in to continue.");
  }

  const profile = await getProfileByEmail(sessionEmail);

  if (!profile) {
    return unauthorized("Your session has expired. Please log in again.");
  }

  return Response.json(await buildDashboardNotebookData(profile));
}
