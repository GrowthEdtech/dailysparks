import {
  clearEditorialAdminSessionCookieHeader,
  getEditorialAdminSessionFromRequest,
} from "../../../../../lib/editorial-admin-auth";
import { runOperationsHealthWorkflow } from "../../../../../lib/operations-health-runner";

function unauthorized(message: string) {
  return Response.json(
    { message },
    {
      status: 401,
      headers: {
        "Set-Cookie": clearEditorialAdminSessionCookieHeader(),
      },
    },
  );
}

async function requireAdminSession(request: Request) {
  const session = await getEditorialAdminSessionFromRequest(request);

  if (!session) {
    return {
      errorResponse: unauthorized("Please log in to the editorial admin."),
      session: null,
    };
  }

  return {
    errorResponse: null,
    session,
  };
}

export async function POST(request: Request) {
  const adminCheck = await requireAdminSession(request);

  if (adminCheck.errorResponse) {
    return adminCheck.errorResponse;
  }

  const result = await runOperationsHealthWorkflow({
    source: "manual",
  });

  return Response.json({
    mode: "operations-health",
    run: result.run,
    snapshot: result.snapshot,
    summary: {
      status: result.snapshot.status,
      alertCount: result.snapshot.alerts.length,
    },
  });
}
