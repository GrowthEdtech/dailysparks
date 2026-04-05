import {
  clearEditorialAdminSessionCookieHeader,
  getEditorialAdminSessionFromRequest,
} from "../../../../lib/editorial-admin-auth";
import { createGeoVisibilityLog, listGeoVisibilityLogs } from "../../../../lib/geo-visibility-log-store";
import {
  GEO_ENTITY_ACCURACY_LABELS,
  GEO_SENTIMENT_LABELS,
  GEO_VISIBILITY_MENTION_STATUSES,
  type GeoEntityAccuracyLabel,
  type GeoSentimentLabel,
  type GeoVisibilityMentionStatus,
} from "../../../../lib/geo-visibility-log-schema";
import { GEO_ENGINE_TYPES, type GeoEngineType } from "../../../../lib/geo-prompt-schema";

type GeoVisibilityLogRequestBody = {
  promptId?: unknown;
  promptTextSnapshot?: unknown;
  engine?: unknown;
  mentionStatus?: unknown;
  citationUrls?: unknown;
  shareOfModelScore?: unknown;
  citationShareScore?: unknown;
  sentiment?: unknown;
  entityAccuracy?: unknown;
  responseExcerpt?: unknown;
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

  return value
    .map((item) => normalizeString(item))
    .filter(Boolean);
}

function isAllowedValue<T extends string>(
  value: string,
  allowedValues: readonly T[],
): value is T {
  return allowedValues.includes(value as T);
}

function normalizeEngine(value: unknown): GeoEngineType | null {
  const normalized = normalizeString(value);
  return isAllowedValue(normalized, GEO_ENGINE_TYPES) ? normalized : null;
}

function normalizeMentionStatus(value: unknown): GeoVisibilityMentionStatus | null {
  const normalized = normalizeString(value);
  return isAllowedValue(normalized, GEO_VISIBILITY_MENTION_STATUSES)
    ? normalized
    : null;
}

function normalizeSentiment(value: unknown): GeoSentimentLabel | null {
  const normalized = normalizeString(value);
  return isAllowedValue(normalized, GEO_SENTIMENT_LABELS) ? normalized : null;
}

function normalizeEntityAccuracy(value: unknown): GeoEntityAccuracyLabel | null {
  const normalized = normalizeString(value);
  return isAllowedValue(normalized, GEO_ENTITY_ACCURACY_LABELS)
    ? normalized
    : null;
}

function normalizeScore(value: unknown) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : 0;
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

function validateCreateBody(body: GeoVisibilityLogRequestBody | null) {
  if (!body) {
    return null;
  }

  const promptId = normalizeString(body.promptId);
  const promptTextSnapshot = normalizeString(body.promptTextSnapshot);
  const engine = normalizeEngine(body.engine);
  const mentionStatus = normalizeMentionStatus(body.mentionStatus);
  const sentiment = normalizeSentiment(body.sentiment);
  const entityAccuracy = normalizeEntityAccuracy(body.entityAccuracy);

  if (
    !promptId ||
    !promptTextSnapshot ||
    !engine ||
    !mentionStatus ||
    !sentiment ||
    !entityAccuracy
  ) {
    return null;
  }

  return {
    promptId,
    promptTextSnapshot,
    engine,
    mentionStatus,
    citationUrls: normalizeStringList(body.citationUrls),
    shareOfModelScore: normalizeScore(body.shareOfModelScore),
    citationShareScore: normalizeScore(body.citationShareScore),
    sentiment,
    entityAccuracy,
    responseExcerpt: normalizeString(body.responseExcerpt),
    notes: normalizeString(body.notes),
  };
}

export async function GET(request: Request) {
  const adminCheck = await requireAdminSession(request);

  if (adminCheck.errorResponse) {
    return adminCheck.errorResponse;
  }

  const logs = await listGeoVisibilityLogs();
  return Response.json({ logs });
}

export async function POST(request: Request) {
  const adminCheck = await requireAdminSession(request);

  if (adminCheck.errorResponse) {
    return adminCheck.errorResponse;
  }

  const body = (await request.json().catch(() => null)) as
    | GeoVisibilityLogRequestBody
    | null;
  const input = validateCreateBody(body);

  if (!input) {
    return badRequest("Please submit a valid GEO visibility log entry.");
  }

  const log = await createGeoVisibilityLog(input);
  return Response.json({ log });
}
