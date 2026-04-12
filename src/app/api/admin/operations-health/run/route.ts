import { after } from "next/server";

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

  after(async () => {
    try {
      await runOperationsHealthWorkflow({
        source: "manual",
      });
    } catch (error) {
      console.error("Background operations health run failed.", error);
    }
  });

  return Response.json({
    mode: "operations-health-async",
    message:
      "Operations health run queued. Refresh this page in about a minute to see the next immutable run.",
    queuedAt: new Date().toISOString(),
  }, { status: 202 });
}
