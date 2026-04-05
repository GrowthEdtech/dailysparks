import {
  clearEditorialAdminSessionCookieHeader,
  getEditorialAdminSessionFromRequest,
} from "../../../../lib/editorial-admin-auth";
import {
  createGeoPrompt,
  listGeoPrompts,
  updateGeoPrompt,
} from "../../../../lib/geo-prompt-store";
import {
  GEO_ENGINE_TYPES,
  GEO_PROMPT_PRIORITIES,
  type GeoEngineType,
  type GeoPromptPriority,
} from "../../../../lib/geo-prompt-schema";
import type { Programme } from "../../../../lib/mvp-types";

type GeoPromptRequestBody = {
  id?: unknown;
  prompt?: unknown;
  intentLabel?: unknown;
  priority?: unknown;
  targetProgrammes?: unknown;
  engineCoverage?: unknown;
  fanOutHints?: unknown;
  active?: unknown;
  notes?: unknown;
};

const PROGRAMMES: Programme[] = ["PYP", "MYP", "DP"];

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

function normalizePriority(value: unknown): GeoPromptPriority | null {
  const normalized = normalizeString(value);
  return isAllowedValue(normalized, GEO_PROMPT_PRIORITIES) ? normalized : null;
}

function normalizeTargetProgrammes(value: unknown) {
  return normalizeStringList(value).filter((item): item is Programme =>
    isAllowedValue(item, PROGRAMMES),
  );
}

function normalizeEngineCoverage(value: unknown) {
  return normalizeStringList(value).filter((item): item is GeoEngineType =>
    isAllowedValue(item, GEO_ENGINE_TYPES),
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

function validateCreateBody(body: GeoPromptRequestBody | null) {
  if (!body) {
    return null;
  }

  const prompt = normalizeString(body.prompt);
  const intentLabel = normalizeString(body.intentLabel);
  const priority = normalizePriority(body.priority);
  const targetProgrammes = normalizeTargetProgrammes(body.targetProgrammes);
  const engineCoverage = normalizeEngineCoverage(body.engineCoverage);
  const fanOutHints = normalizeStringList(body.fanOutHints);
  const notes = normalizeString(body.notes);

  if (!prompt || !intentLabel || !priority || engineCoverage.length === 0) {
    return null;
  }

  return {
    prompt,
    intentLabel,
    priority,
    targetProgrammes,
    engineCoverage,
    fanOutHints,
    active: body.active !== false,
    notes,
  };
}

export async function GET(request: Request) {
  const adminCheck = await requireAdminSession(request);

  if (adminCheck.errorResponse) {
    return adminCheck.errorResponse;
  }

  const prompts = await listGeoPrompts();
  return Response.json({ prompts });
}

export async function POST(request: Request) {
  const adminCheck = await requireAdminSession(request);

  if (adminCheck.errorResponse) {
    return adminCheck.errorResponse;
  }

  const body = (await request.json().catch(() => null)) as
    | GeoPromptRequestBody
    | null;
  const input = validateCreateBody(body);

  if (!input) {
    return badRequest("Please submit a valid GEO prompt.");
  }

  const prompt = await createGeoPrompt(input);
  return Response.json({ prompt });
}

export async function PUT(request: Request) {
  const adminCheck = await requireAdminSession(request);

  if (adminCheck.errorResponse) {
    return adminCheck.errorResponse;
  }

  const body = (await request.json().catch(() => null)) as
    | GeoPromptRequestBody
    | null;

  if (!body) {
    return badRequest("Please submit a valid request body.");
  }

  const id = normalizeString(body.id);

  if (!id) {
    return badRequest("Please choose a GEO prompt to update.");
  }

  const updateInput = {
    ...(body.prompt !== undefined ? { prompt: normalizeString(body.prompt) } : {}),
    ...(body.intentLabel !== undefined
      ? { intentLabel: normalizeString(body.intentLabel) }
      : {}),
    ...(body.priority !== undefined
      ? { priority: normalizePriority(body.priority) ?? "medium" }
      : {}),
    ...(body.targetProgrammes !== undefined
      ? { targetProgrammes: normalizeTargetProgrammes(body.targetProgrammes) }
      : {}),
    ...(body.engineCoverage !== undefined
      ? { engineCoverage: normalizeEngineCoverage(body.engineCoverage) }
      : {}),
    ...(body.fanOutHints !== undefined
      ? { fanOutHints: normalizeStringList(body.fanOutHints) }
      : {}),
    ...(body.active !== undefined ? { active: body.active === true } : {}),
    ...(body.notes !== undefined ? { notes: normalizeString(body.notes) } : {}),
  };

  const prompt = await updateGeoPrompt(id, updateInput);

  if (!prompt) {
    return badRequest("The requested GEO prompt could not be found.");
  }

  return Response.json({ prompt });
}
