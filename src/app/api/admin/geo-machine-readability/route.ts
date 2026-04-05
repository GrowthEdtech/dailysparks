import {
  clearEditorialAdminSessionCookieHeader,
  getEditorialAdminSessionFromRequest,
} from "../../../../lib/editorial-admin-auth";
import {
  getGeoMachineReadabilityStatus,
  updateGeoMachineReadabilityStatus,
} from "../../../../lib/geo-machine-readability-store";
import {
  GEO_READINESS_STATUSES,
  type GeoReadinessStatus,
} from "../../../../lib/geo-machine-readability-schema";

type GeoMachineReadabilityRequestBody = {
  llmsTxtStatus?: unknown;
  llmsFullTxtStatus?: unknown;
  ssrStatus?: unknown;
  jsonLdStatus?: unknown;
  notes?: unknown;
  lastCheckedAt?: unknown;
};

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

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isAllowedValue<T extends string>(
  value: string,
  allowedValues: readonly T[],
): value is T {
  return allowedValues.includes(value as T);
}

function normalizeStatus(value: unknown): GeoReadinessStatus | undefined {
  const normalized = normalizeString(value);
  return isAllowedValue(normalized, GEO_READINESS_STATUSES)
    ? normalized
    : undefined;
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

export async function GET(request: Request) {
  const adminCheck = await requireAdminSession(request);

  if (adminCheck.errorResponse) {
    return adminCheck.errorResponse;
  }

  const status = await getGeoMachineReadabilityStatus();
  return Response.json({ status });
}

export async function PUT(request: Request) {
  const adminCheck = await requireAdminSession(request);

  if (adminCheck.errorResponse) {
    return adminCheck.errorResponse;
  }

  const body = (await request.json().catch(() => null)) as
    | GeoMachineReadabilityRequestBody
    | null;

  const status = await updateGeoMachineReadabilityStatus({
    llmsTxtStatus: normalizeStatus(body?.llmsTxtStatus),
    llmsFullTxtStatus: normalizeStatus(body?.llmsFullTxtStatus),
    ssrStatus: normalizeStatus(body?.ssrStatus),
    jsonLdStatus: normalizeStatus(body?.jsonLdStatus),
    notes: body?.notes !== undefined ? normalizeString(body.notes) : undefined,
    lastCheckedAt:
      body?.lastCheckedAt !== undefined
        ? normalizeString(body.lastCheckedAt) || null
        : undefined,
  });

  return Response.json({ status });
}
