import {
  createAiConnection,
  deleteAiConnection,
  listAiConnections,
  updateAiConnection,
} from "../../../../lib/ai-connection-store";
import {
  AI_CONNECTION_PROVIDER_TYPES,
  buildVertexAiOpenAiBaseUrl,
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
  fallbackConnectionId?: unknown;
  vertexProjectId?: unknown;
  vertexLocation?: unknown;
  serviceAccountEmail?: unknown;
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

  const body = (await request.json().catch(() => null)) as
    | AiConnectionRequestBody
    | null;
  const providerType = normalizeProviderType(body?.providerType);

  if (
    providerType === "openai-compatible" &&
    !isAiConnectionEncryptionConfigured()
  ) {
    return serviceUnavailable("AI connection encryption is not configured yet.");
  }
  const name = normalizeString(body?.name);
  const baseUrl = normalizeString(body?.baseUrl);
  const defaultModel = normalizeString(body?.defaultModel);
  const apiKey = normalizeString(body?.apiKey);
  const notes = normalizeString(body?.notes);
  const vertexProjectId = normalizeString(body?.vertexProjectId);
  const vertexLocation = normalizeString(body?.vertexLocation);
  const serviceAccountEmail = normalizeString(body?.serviceAccountEmail);
  const fallbackConnectionId = normalizeString(body?.fallbackConnectionId);

  if (!name || !providerType || !defaultModel) {
    return badRequest("Please submit a valid AI connection.");
  }

  if (
    providerType === "openai-compatible" &&
    (!baseUrl || !apiKey)
  ) {
    return badRequest("Please submit a valid AI connection.");
  }

  if (
    providerType === "vertex-openai-compatible" &&
    (!vertexProjectId || !vertexLocation || !serviceAccountEmail)
  ) {
    return badRequest("Please submit a valid Vertex AI connection.");
  }

  if (
    fallbackConnectionId &&
    !(await listAiConnections()).some(
      (connection) => connection.id === fallbackConnectionId,
    )
  ) {
    return badRequest("Please choose a valid fallback AI connection.");
  }

  const connection = await createAiConnection({
    name,
    providerType,
    baseUrl:
      providerType === "vertex-openai-compatible"
        ? buildVertexAiOpenAiBaseUrl(vertexProjectId, vertexLocation)
        : baseUrl,
    defaultModel,
    apiKey,
    active: normalizeBoolean(body?.active),
    isDefault: normalizeBoolean(body?.isDefault),
    notes,
    fallbackConnectionId,
    vertexProjectId,
    vertexLocation,
    serviceAccountEmail,
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

  const existingConnections = await listAiConnections();
  const existingConnection = existingConnections.find((connection) => connection.id === id);

  if (!existingConnection) {
    return Response.json(
      { message: "We could not find that AI connection." },
      { status: 404 },
    );
  }

  const requestedProviderType =
    body?.providerType !== undefined
      ? normalizeProviderType(body.providerType)
      : undefined;

  if (
    body?.providerType !== undefined &&
    !requestedProviderType
  ) {
    return badRequest("Please choose a supported AI provider type.");
  }

  const effectiveProviderType =
    requestedProviderType ?? existingConnection.providerType;

  if (
    effectiveProviderType === "openai-compatible" &&
    body?.apiKey !== undefined &&
    !isAiConnectionEncryptionConfigured()
  ) {
    return serviceUnavailable("AI connection encryption is not configured yet.");
  }

  const normalizedBaseUrl =
    body?.baseUrl !== undefined ? normalizeString(body.baseUrl) : undefined;
  const normalizedDefaultModel =
    body?.defaultModel !== undefined
      ? normalizeString(body.defaultModel)
      : undefined;
  const normalizedApiKey =
    body?.apiKey !== undefined ? normalizeString(body.apiKey) : undefined;
  const normalizedVertexProjectId =
    body?.vertexProjectId !== undefined
      ? normalizeString(body.vertexProjectId)
      : undefined;
  const normalizedVertexLocation =
    body?.vertexLocation !== undefined
      ? normalizeString(body.vertexLocation)
      : undefined;
  const normalizedServiceAccountEmail =
    body?.serviceAccountEmail !== undefined
      ? normalizeString(body.serviceAccountEmail)
      : undefined;
  const normalizedFallbackConnectionId =
    body?.fallbackConnectionId !== undefined
      ? normalizeString(body.fallbackConnectionId)
      : undefined;
  const effectiveVertexProjectId =
    normalizedVertexProjectId ?? existingConnection.vertexProjectId ?? "";
  const effectiveVertexLocation =
    normalizedVertexLocation ?? existingConnection.vertexLocation ?? "";
  const effectiveServiceAccountEmail =
    normalizedServiceAccountEmail ?? existingConnection.serviceAccountEmail ?? "";

  if (
    effectiveProviderType === "openai-compatible" &&
    requestedProviderType === "openai-compatible" &&
    (!normalizedBaseUrl || !normalizedApiKey)
  ) {
    return badRequest(
      "Please submit a valid OpenAI-compatible connection with a fresh API key.",
    );
  }

  if (
    effectiveProviderType === "vertex-openai-compatible" &&
    (!effectiveVertexProjectId ||
      !effectiveVertexLocation ||
      !effectiveServiceAccountEmail)
  ) {
    return badRequest("Please submit a valid Vertex AI connection.");
  }

  if (normalizedFallbackConnectionId && normalizedFallbackConnectionId === id) {
    return badRequest("A connection cannot fall back to itself.");
  }

  if (
    normalizedFallbackConnectionId &&
    !existingConnections.some(
      (connection) => connection.id === normalizedFallbackConnectionId,
    )
  ) {
    return badRequest("Please choose a valid fallback AI connection.");
  }

  const updateInput = {
    ...(body?.name !== undefined ? { name: normalizeString(body.name) } : {}),
    ...(requestedProviderType ? { providerType: requestedProviderType } : {}),
    ...(effectiveProviderType === "vertex-openai-compatible"
      ? {
          baseUrl: buildVertexAiOpenAiBaseUrl(
            effectiveVertexProjectId,
            effectiveVertexLocation,
          ),
        }
      : normalizedBaseUrl !== undefined
        ? { baseUrl: normalizedBaseUrl }
        : {}),
    ...(normalizedDefaultModel !== undefined
      ? { defaultModel: normalizedDefaultModel }
      : {}),
    ...(normalizedApiKey !== undefined ? { apiKey: normalizedApiKey } : {}),
    ...(body?.active !== undefined
      ? { active: normalizeBoolean(body.active) }
      : {}),
    ...(body?.isDefault !== undefined
      ? { isDefault: normalizeBoolean(body.isDefault) }
      : {}),
    ...(body?.notes !== undefined ? { notes: normalizeString(body.notes) } : {}),
    ...(normalizedFallbackConnectionId !== undefined
      ? { fallbackConnectionId: normalizedFallbackConnectionId }
      : {}),
    ...(normalizedVertexProjectId !== undefined
      ? { vertexProjectId: normalizedVertexProjectId }
      : {}),
    ...(normalizedVertexLocation !== undefined
      ? { vertexLocation: normalizedVertexLocation }
      : {}),
    ...(normalizedServiceAccountEmail !== undefined
      ? { serviceAccountEmail: normalizedServiceAccountEmail }
      : {}),
  };

  const connection = await updateAiConnection(id, updateInput);

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
