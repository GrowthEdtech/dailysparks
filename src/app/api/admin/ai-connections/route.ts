import {
  createAiConnection,
  deleteAiConnection,
  listAiConnections,
  updateAiConnection,
} from "../../../../lib/ai-connection-store";
import {
  AI_CONNECTION_PROVIDER_TYPES,
  type AiConnectionProviderType,
} from "../../../../lib/ai-connection-schema";
import {
  clearEditorialAdminSessionCookieHeader,
  getEditorialAdminSessionFromRequest,
} from "../../../../lib/editorial-admin-auth";
import { isAiConnectionEncryptionConfigured } from "../../../../lib/ai-connection-crypto";

type AiConnectionRequestBody = {
  id?: unknown;
  name?: unknown;
  providerType?: unknown;
  baseUrl?: unknown;
  defaultModel?: unknown;
  apiKey?: unknown;
  active?: unknown;
  isDefault?: unknown;
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

function serviceUnavailable(message: string) {
  return Response.json({ message }, { status: 503 });
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBoolean(value: unknown) {
  return value === true;
}

function normalizeProviderType(value: unknown): AiConnectionProviderType | null {
  const normalizedValue = normalizeString(value);

  return (
    AI_CONNECTION_PROVIDER_TYPES as readonly string[]
  ).includes(normalizedValue)
    ? (normalizedValue as AiConnectionProviderType)
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

export async function GET(request: Request) {
  const adminCheck = await requireAdminSession(request);

  if (adminCheck.errorResponse) {
    return adminCheck.errorResponse;
  }

  const connections = await listAiConnections();

  return Response.json({ connections });
}

export async function POST(request: Request) {
  const adminCheck = await requireAdminSession(request);

  if (adminCheck.errorResponse) {
    return adminCheck.errorResponse;
  }

  if (!isAiConnectionEncryptionConfigured()) {
    return serviceUnavailable("AI connection encryption is not configured yet.");
  }

  const body = (await request.json().catch(() => null)) as
    | AiConnectionRequestBody
    | null;
  const name = normalizeString(body?.name);
  const providerType = normalizeProviderType(body?.providerType);
  const baseUrl = normalizeString(body?.baseUrl);
  const defaultModel = normalizeString(body?.defaultModel);
  const apiKey = normalizeString(body?.apiKey);
  const notes = normalizeString(body?.notes);

  if (!name || !providerType || !baseUrl || !defaultModel || !apiKey) {
    return badRequest("Please submit a valid AI connection.");
  }

  const connection = await createAiConnection({
    name,
    providerType,
    baseUrl,
    defaultModel,
    apiKey,
    active: normalizeBoolean(body?.active),
    isDefault: normalizeBoolean(body?.isDefault),
    notes,
  });

  return Response.json({ connection });
}

export async function PUT(request: Request) {
  const adminCheck = await requireAdminSession(request);

  if (adminCheck.errorResponse) {
    return adminCheck.errorResponse;
  }

  const body = (await request.json().catch(() => null)) as
    | AiConnectionRequestBody
    | null;
  const id = normalizeString(body?.id);

  if (!id) {
    return badRequest("Please choose an AI connection to update.");
  }

  if (body?.apiKey !== undefined && !isAiConnectionEncryptionConfigured()) {
    return serviceUnavailable("AI connection encryption is not configured yet.");
  }

  const providerType =
    body?.providerType !== undefined
      ? normalizeProviderType(body.providerType)
      : undefined;

  if (body?.providerType !== undefined && !providerType) {
    return badRequest("Please choose a supported AI provider type.");
  }

  const updateInput = {
    ...(body?.name !== undefined ? { name: normalizeString(body.name) } : {}),
    ...(providerType ? { providerType } : {}),
    ...(body?.baseUrl !== undefined
      ? { baseUrl: normalizeString(body.baseUrl) }
      : {}),
    ...(body?.defaultModel !== undefined
      ? { defaultModel: normalizeString(body.defaultModel) }
      : {}),
    ...(body?.apiKey !== undefined ? { apiKey: normalizeString(body.apiKey) } : {}),
    ...(body?.active !== undefined
      ? { active: normalizeBoolean(body.active) }
      : {}),
    ...(body?.isDefault !== undefined
      ? { isDefault: normalizeBoolean(body.isDefault) }
      : {}),
    ...(body?.notes !== undefined ? { notes: normalizeString(body.notes) } : {}),
  };

  const connection = await updateAiConnection(id, updateInput);

  if (!connection) {
    return Response.json(
      { message: "We could not find that AI connection." },
      { status: 404 },
    );
  }

  return Response.json({ connection });
}

export async function DELETE(request: Request) {
  const adminCheck = await requireAdminSession(request);

  if (adminCheck.errorResponse) {
    return adminCheck.errorResponse;
  }

  const body = (await request.json().catch(() => null)) as
    | AiConnectionRequestBody
    | null;
  const id = normalizeString(body?.id);

  if (!id) {
    return badRequest("Please choose an AI connection to delete.");
  }

  const deleted = await deleteAiConnection(id);

  if (!deleted) {
    return Response.json(
      { message: "We could not find that AI connection." },
      { status: 404 },
    );
  }

  return Response.json({ success: true });
}
