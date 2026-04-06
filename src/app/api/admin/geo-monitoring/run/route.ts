import {
  clearEditorialAdminSessionCookieHeader,
  getEditorialAdminSessionFromRequest,
} from "../../../../../lib/editorial-admin-auth";
import { runGeoMonitoring } from "../../../../../lib/geo-monitoring";

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

  const result = await runGeoMonitoring({ source: "manual" });

  return Response.json({
    mode: "geo-monitoring",
    run: result.run,
    logs: result.logs,
    machineReadabilityStatus: result.machineReadabilityStatus,
    summary: {
      logCreatedCount: result.logs.length,
      machineReadabilityReadyCount: result.run.machineReadabilityReadyCount,
      runStatus: result.run.status,
    },
  });
}
