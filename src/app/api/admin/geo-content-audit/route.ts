import {
  clearEditorialAdminSessionCookieHeader,
  getEditorialAdminSessionFromRequest,
} from "../../../../lib/editorial-admin-auth";
import { auditGeoContent } from "../../../../lib/geo-content-audit";

type GeoContentAuditRequestBody = {
  title?: unknown;
  headings?: unknown;
  body?: unknown;
  referenceNotes?: unknown;
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

  const body = (await request.json().catch(() => null)) as
    | GeoContentAuditRequestBody
    | null;

  if (!body) {
    return badRequest("Please submit draft content to audit.");
  }

  const title = normalizeString(body.title);
  const headings = normalizeString(body.headings);
  const draftBody = normalizeString(body.body);
  const referenceNotes = normalizeString(body.referenceNotes);

  if (!title && !headings && !draftBody) {
    return badRequest("Please submit a title, headings, or draft body to audit.");
  }

  const result = auditGeoContent({
    title,
    headings,
    body: draftBody,
    referenceNotes,
  });

  return Response.json({ result });
}
