import {
  clearEditorialAdminSessionCookieHeader,
  getEditorialAdminSessionFromRequest,
} from "../../../../lib/editorial-admin-auth";
import {
  createGeoAioEvidence,
  listGeoAioEvidence,
} from "../../../../lib/geo-aio-evidence-store";
import {
  GEO_AIO_EVIDENCE_STATUSES,
  type GeoAioEvidenceStatus,
} from "../../../../lib/geo-aio-evidence-schema";

type GeoAioEvidenceRequestBody = {
  promptId?: unknown;
  promptTextSnapshot?: unknown;
  queryVariant?: unknown;
  aiOverviewStatus?: unknown;
  citationUrls?: unknown;
  dailySparksCited?: unknown;
  evidenceUrl?: unknown;
  screenshotUrl?: unknown;
  observedAt?: unknown;
  notes?: unknown;
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

function badRequest(message: string) {
  return Response.json({ message }, { status: 400 });
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => normalizeString(item)).filter(Boolean);
}

function normalizeBoolean(value: unknown) {
  return value === true;
}

function isAllowedValue<T extends string>(
  value: string,
  allowedValues: readonly T[],
): value is T {
  return allowedValues.includes(value as T);
}

function normalizeAioStatus(value: unknown): GeoAioEvidenceStatus | null {
  const normalized = normalizeString(value);
  return isAllowedValue(normalized, GEO_AIO_EVIDENCE_STATUSES)
    ? normalized
    : null;
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

function validateCreateBody(body: GeoAioEvidenceRequestBody | null) {
  if (!body) {
    return null;
  }

  const promptId = normalizeString(body.promptId);
  const promptTextSnapshot = normalizeString(body.promptTextSnapshot);
  const queryVariant = normalizeString(body.queryVariant);
  const aiOverviewStatus = normalizeAioStatus(body.aiOverviewStatus);

  if (!promptId || !promptTextSnapshot || !queryVariant || !aiOverviewStatus) {
    return null;
  }

  return {
    promptId,
    promptTextSnapshot,
    queryVariant,
    aiOverviewStatus,
    citationUrls: normalizeStringList(body.citationUrls),
    dailySparksCited: normalizeBoolean(body.dailySparksCited),
    evidenceUrl: normalizeString(body.evidenceUrl),
    screenshotUrl: normalizeString(body.screenshotUrl),
    observedAt: normalizeString(body.observedAt),
    notes: normalizeString(body.notes),
  };
}

export async function GET(request: Request) {
  const adminCheck = await requireAdminSession(request);

  if (adminCheck.errorResponse) {
    return adminCheck.errorResponse;
  }

  const evidence = await listGeoAioEvidence();
  return Response.json({ evidence });
}

export async function POST(request: Request) {
  const adminCheck = await requireAdminSession(request);

  if (adminCheck.errorResponse) {
    return adminCheck.errorResponse;
  }

  const body = (await request.json().catch(() => null)) as
    | GeoAioEvidenceRequestBody
    | null;
  const input = validateCreateBody(body);

  if (!input) {
    return badRequest("Please submit valid Google AI Overviews evidence.");
  }

  const evidence = await createGeoAioEvidence(input);
  return Response.json({ evidence });
}
