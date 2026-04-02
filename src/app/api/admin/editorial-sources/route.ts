import {
  clearEditorialAdminSessionCookieHeader,
  getEditorialAdminSessionFromRequest,
} from "../../../../lib/editorial-admin-auth";
import {
  createEditorialSource,
  EDITORIAL_INGESTION_MODES,
  listEditorialSources,
  updateEditorialSource,
} from "../../../../lib/editorial-source-store";
import type {
  CreateEditorialSourceInput,
  EditorialIngestionMode,
} from "../../../../lib/editorial-source-store";
import type { Programme } from "../../../../lib/mvp-types";
import type {
  EditorialSourceRole,
  EditorialUsageTier,
} from "../../../../lib/editorial-policy";

type EditorialSourceRequestBody = {
  id?: unknown;
  name?: unknown;
  domain?: unknown;
  homepage?: unknown;
  roles?: unknown;
  usageTiers?: unknown;
  recommendedProgrammes?: unknown;
  sections?: unknown;
  ingestionMode?: unknown;
  active?: unknown;
  notes?: unknown;
};

const PROGRAMMES: Programme[] = ["PYP", "MYP", "DP"];
const EDITORIAL_SOURCE_ROLES: EditorialSourceRole[] = [
  "daily-news",
  "explainer",
  "pyp-friendly",
  "source-of-record",
];
const EDITORIAL_USAGE_TIERS: EditorialUsageTier[] = [
  "primary-selection",
  "background-context",
  "fact-check",
];

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

function normalizeRoles(value: unknown) {
  return normalizeStringList(value).filter((item): item is EditorialSourceRole =>
    isAllowedValue(item, EDITORIAL_SOURCE_ROLES),
  );
}

function normalizeUsageTiers(value: unknown) {
  return normalizeStringList(value).filter((item): item is EditorialUsageTier =>
    isAllowedValue(item, EDITORIAL_USAGE_TIERS),
  );
}

function normalizeRecommendedProgrammes(value: unknown) {
  return normalizeStringList(value).filter((item): item is Programme =>
    isAllowedValue(item, PROGRAMMES),
  );
}

function normalizeIngestionMode(value: unknown): EditorialIngestionMode | null {
  const normalizedValue = normalizeString(value);

  return isAllowedValue(normalizedValue, EDITORIAL_INGESTION_MODES)
    ? normalizedValue
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

function validateCreateBody(
  body: EditorialSourceRequestBody | null,
): CreateEditorialSourceInput | null {
  if (!body) {
    return null;
  }

  const name = normalizeString(body.name);
  const domain = normalizeString(body.domain).toLowerCase();
  const homepage = normalizeString(body.homepage);
  const roles = normalizeRoles(body.roles);
  const usageTiers = normalizeUsageTiers(body.usageTiers);
  const recommendedProgrammes = normalizeRecommendedProgrammes(
    body.recommendedProgrammes,
  );
  const sections = normalizeStringList(body.sections);
  const ingestionMode = normalizeIngestionMode(body.ingestionMode);
  const notes = normalizeString(body.notes);

  if (!name || !domain || !homepage || !ingestionMode) {
    return null;
  }

  if (roles.length === 0 || usageTiers.length === 0) {
    return null;
  }

  return {
    name,
    domain,
    homepage,
    roles,
    usageTiers,
    recommendedProgrammes,
    sections,
    ingestionMode,
    active: body.active !== false,
    notes,
  };
}

export async function GET(request: Request) {
  const adminCheck = await requireAdminSession(request);

  if (adminCheck.errorResponse) {
    return adminCheck.errorResponse;
  }

  const sources = await listEditorialSources();

  return Response.json({ sources });
}

export async function POST(request: Request) {
  const adminCheck = await requireAdminSession(request);

  if (adminCheck.errorResponse) {
    return adminCheck.errorResponse;
  }

  const body = (await request.json().catch(() => null)) as
    | EditorialSourceRequestBody
    | null;
  const input = validateCreateBody(body);

  if (!input) {
    return badRequest("Please submit a valid editorial source.");
  }

  const source = await createEditorialSource(input);

  return Response.json({ source });
}

export async function PUT(request: Request) {
  const adminCheck = await requireAdminSession(request);

  if (adminCheck.errorResponse) {
    return adminCheck.errorResponse;
  }

  const body = (await request.json().catch(() => null)) as
    | EditorialSourceRequestBody
    | null;

  if (!body) {
    return badRequest("Please submit a valid request body.");
  }

  const id = normalizeString(body.id);

  if (!id) {
    return badRequest("Please choose a source to update.");
  }

  const updateInput = {
    ...(body.name !== undefined ? { name: normalizeString(body.name) } : {}),
    ...(body.domain !== undefined
      ? { domain: normalizeString(body.domain).toLowerCase() }
      : {}),
    ...(body.homepage !== undefined
      ? { homepage: normalizeString(body.homepage) }
      : {}),
    ...(body.roles !== undefined ? { roles: normalizeRoles(body.roles) } : {}),
    ...(body.usageTiers !== undefined
      ? { usageTiers: normalizeUsageTiers(body.usageTiers) }
      : {}),
    ...(body.recommendedProgrammes !== undefined
      ? {
          recommendedProgrammes: normalizeRecommendedProgrammes(
            body.recommendedProgrammes,
          ),
        }
      : {}),
    ...(body.sections !== undefined
      ? { sections: normalizeStringList(body.sections) }
      : {}),
    ...(body.ingestionMode !== undefined
      ? {
          ingestionMode:
            normalizeIngestionMode(body.ingestionMode) ?? "metadata-only",
        }
      : {}),
    ...(body.active !== undefined ? { active: body.active === true } : {}),
    ...(body.notes !== undefined ? { notes: normalizeString(body.notes) } : {}),
  };

  const source = await updateEditorialSource(id, updateInput);

  if (!source) {
    return badRequest("The requested source could not be found.");
  }

  return Response.json({ source });
}
