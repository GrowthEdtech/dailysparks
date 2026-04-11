import {
  buildAiConnectionApiKeyPreview,
  decryptAiConnectionApiKey,
  encryptAiConnectionApiKey,
  getAiConnectionEncryptionSecret,
} from "./ai-connection-crypto";
import { listDailyBriefHistory } from "./daily-brief-history-store";
import type {
  AiConnectionProviderType,
  AiConnectionRecord,
} from "./ai-connection-schema";
import { buildVertexAiOpenAiBaseUrl } from "./ai-connection-schema";
import { firestoreAiConnectionStore } from "./firestore-ai-connection-store";
import { localAiConnectionStore } from "./local-ai-connection-store";
import type {
  AiConnectionStore,
  CreateAiConnectionInput,
  StoredAiConnectionRecord,
  UpdateAiConnectionInput,
} from "./ai-connection-store-types";
import {
  getProfileStoreBackend,
  validateProfileStoreConfig,
} from "./profile-store-config";

function getAiConnectionStore(): AiConnectionStore {
  validateProfileStoreConfig();

  return getProfileStoreBackend() === "firestore"
    ? firestoreAiConnectionStore
    : localAiConnectionStore;
}

function sanitizeAiConnectionRecord(
  connection: StoredAiConnectionRecord,
): AiConnectionRecord {
  return {
    id: connection.id,
    name: connection.name,
    providerType: connection.providerType,
    baseUrl: connection.baseUrl,
    defaultModel: connection.defaultModel,
    apiKeyPreview: connection.apiKeyPreview,
    hasApiKey: connection.hasApiKey,
    active: connection.active,
    isDefault: connection.isDefault,
    notes: connection.notes,
    fallbackConnectionId: connection.fallbackConnectionId,
    vertexProjectId: connection.vertexProjectId,
    vertexLocation: connection.vertexLocation,
    serviceAccountEmail: connection.serviceAccountEmail,
    lastTestedAt: connection.lastTestedAt,
    lastTestStatus: connection.lastTestStatus,
    lastTestLatencyMs: connection.lastTestLatencyMs,
    lastTestModel: connection.lastTestModel,
    lastTestErrorMessage: connection.lastTestErrorMessage,
    lastRuntimeAt: connection.lastRuntimeAt,
    lastRuntimeStatus: connection.lastRuntimeStatus,
    lastRuntimeLatencyMs: connection.lastRuntimeLatencyMs,
    lastRuntimeModel: connection.lastRuntimeModel,
    lastRuntimeErrorMessage: connection.lastRuntimeErrorMessage,
    runtimeSuccessCount: connection.runtimeSuccessCount,
    runtimeFailureCount: connection.runtimeFailureCount,
    runtimeFallbackCount: connection.runtimeFallbackCount,
    lastFallbackAt: connection.lastFallbackAt,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,
  };
}

export type RuntimeOpenAiCompatibleConnection = AiConnectionRecord & {
  providerType: "openai-compatible";
  apiKey: string;
};

export type RuntimeAiConnection = RuntimeOpenAiCompatibleConnection;

export type RuntimeVertexAiConnection = AiConnectionRecord & {
  providerType: "vertex-openai-compatible";
};

export type RuntimeAiConnectionWithProvider =
  | RuntimeOpenAiCompatibleConnection
  | RuntimeVertexAiConnection;

function buildConnectionBaseUrl(
  providerType: AiConnectionProviderType,
  input: Pick<
    CreateAiConnectionInput,
    "baseUrl" | "vertexLocation" | "vertexProjectId"
  >,
) {
  if (providerType === "vertex-openai-compatible") {
    return buildVertexAiOpenAiBaseUrl(
      input.vertexProjectId ?? "",
      input.vertexLocation ?? "",
    );
  }

  return input.baseUrl.trim();
}

function buildStoredAiConnection(
  input: CreateAiConnectionInput,
): StoredAiConnectionRecord {
  const timestamp = new Date().toISOString();
  const nextBaseUrl = buildConnectionBaseUrl(input.providerType, input);
  const nextVertexProjectId = input.vertexProjectId?.trim() || "";
  const nextVertexLocation = input.vertexLocation?.trim() || "";
  const nextServiceAccountEmail = input.serviceAccountEmail?.trim() || "";
  const baseRecord = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    providerType: input.providerType,
    baseUrl: nextBaseUrl,
    defaultModel: input.defaultModel.trim(),
    active: input.active,
    isDefault: input.isDefault,
    notes: input.notes.trim(),
    fallbackConnectionId: input.fallbackConnectionId?.trim() || "",
    vertexProjectId: nextVertexProjectId,
    vertexLocation: nextVertexLocation,
    serviceAccountEmail: nextServiceAccountEmail,
    lastTestedAt: null,
    lastTestStatus: null,
    lastTestLatencyMs: null,
    lastTestModel: null,
    lastTestErrorMessage: null,
    lastRuntimeAt: null,
    lastRuntimeStatus: null,
    lastRuntimeLatencyMs: null,
    lastRuntimeModel: null,
    lastRuntimeErrorMessage: null,
    runtimeSuccessCount: 0,
    runtimeFailureCount: 0,
    runtimeFallbackCount: 0,
    lastFallbackAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  } satisfies Omit<StoredAiConnectionRecord, "apiKeyCiphertext" | "apiKeyPreview" | "hasApiKey">;

  if (input.providerType === "vertex-openai-compatible") {
    return {
      ...baseRecord,
      apiKeyCiphertext: "",
      apiKeyPreview: "",
      hasApiKey: false,
    };
  }

  const encryptionSecret = getAiConnectionEncryptionSecret();

  if (!encryptionSecret) {
    throw new Error("AI connection encryption secret is not configured.");
  }

  return {
    ...baseRecord,
    apiKeyCiphertext: encryptAiConnectionApiKey(encryptionSecret, input.apiKey),
    apiKeyPreview: buildAiConnectionApiKeyPreview(input.apiKey),
    hasApiKey: true,
  };
}

function buildRuntimeConnection(
  connection: StoredAiConnectionRecord | null | undefined,
  encryptionSecret: string | null,
): RuntimeAiConnectionWithProvider | null {
  if (!connection) {
    return null;
  }

  if (connection.providerType === "vertex-openai-compatible") {
    return sanitizeAiConnectionRecord(connection) as RuntimeVertexAiConnection;
  }

  if (!encryptionSecret) {
    return null;
  }

  return {
    ...sanitizeAiConnectionRecord(connection),
    apiKey: decryptAiConnectionApiKey(
      encryptionSecret,
      connection.apiKeyCiphertext,
    ),
  } as RuntimeOpenAiCompatibleConnection;
}

function stripRuntimeConnectionSecret(
  connection: RuntimeAiConnectionWithProvider,
): AiConnectionRecord {
  if (connection.providerType === "openai-compatible") {
    return {
      id: connection.id,
      name: connection.name,
      providerType: connection.providerType,
      baseUrl: connection.baseUrl,
      defaultModel: connection.defaultModel,
      apiKeyPreview: connection.apiKeyPreview,
      hasApiKey: connection.hasApiKey,
      active: connection.active,
      isDefault: connection.isDefault,
      notes: connection.notes,
      fallbackConnectionId: connection.fallbackConnectionId,
      vertexProjectId: connection.vertexProjectId,
      vertexLocation: connection.vertexLocation,
      serviceAccountEmail: connection.serviceAccountEmail,
      lastTestedAt: connection.lastTestedAt,
      lastTestStatus: connection.lastTestStatus,
      lastTestLatencyMs: connection.lastTestLatencyMs,
      lastTestModel: connection.lastTestModel,
      lastTestErrorMessage: connection.lastTestErrorMessage,
      lastRuntimeAt: connection.lastRuntimeAt,
      lastRuntimeStatus: connection.lastRuntimeStatus,
      lastRuntimeLatencyMs: connection.lastRuntimeLatencyMs,
      lastRuntimeModel: connection.lastRuntimeModel,
      lastRuntimeErrorMessage: connection.lastRuntimeErrorMessage,
      runtimeSuccessCount: connection.runtimeSuccessCount,
      runtimeFailureCount: connection.runtimeFailureCount,
      runtimeFallbackCount: connection.runtimeFallbackCount,
      lastFallbackAt: connection.lastFallbackAt,
      recentDailyBriefUsageCount: connection.recentDailyBriefUsageCount,
      recentDailyBriefLastUsedAt: connection.recentDailyBriefLastUsedAt,
      recentDailyBriefLastModel: connection.recentDailyBriefLastModel,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  }

  return connection;
}

function buildRecentUsageMap(
  entries: Awaited<ReturnType<typeof listDailyBriefHistory>>,
) {
  const usageByConnection = new Map<
    string,
    { count: number; lastUsedAt: string | null; lastModel: string | null }
  >();

  for (const entry of entries) {
    if (!entry.aiConnectionId) {
      continue;
    }

    const existing = usageByConnection.get(entry.aiConnectionId) ?? {
      count: 0,
      lastUsedAt: null,
      lastModel: null,
    };
    const isNewer = !existing.lastUsedAt || entry.updatedAt > existing.lastUsedAt;

    usageByConnection.set(entry.aiConnectionId, {
      count: existing.count + 1,
      lastUsedAt: isNewer ? entry.updatedAt : existing.lastUsedAt,
      lastModel: isNewer ? entry.aiModel || null : existing.lastModel,
    });
  }

  return usageByConnection;
}

export async function listAiConnections() {
  const store = getAiConnectionStore();
  const connections = await store.listConnections();

  return connections.map((connection) => sanitizeAiConnectionRecord(connection));
}

export async function listAiConnectionsWithOpsSummary() {
  const [connections, historyEntries] = await Promise.all([
    listAiConnections(),
    listDailyBriefHistory(),
  ]);
  const usageByConnection = buildRecentUsageMap(historyEntries);

  return connections.map((connection) => {
    const usage = usageByConnection.get(connection.id);

    return {
      ...connection,
      recentDailyBriefUsageCount: usage?.count ?? 0,
      recentDailyBriefLastUsedAt: usage?.lastUsedAt ?? null,
      recentDailyBriefLastModel: usage?.lastModel ?? null,
    };
  });
}

export async function getDefaultAiConnection() {
  const store = getAiConnectionStore();
  const connections = await store.listConnections();
  const defaultConnection = connections.find(
    (connection) => connection.isDefault && connection.active,
  );

  return defaultConnection ? sanitizeAiConnectionRecord(defaultConnection) : null;
}

export async function getAiConnectionWithSecret(id: string) {
  const store = getAiConnectionStore();
  const connections = await store.listConnections();
  const connection = connections.find((candidate) => candidate.id === id);

  return buildRuntimeConnection(connection, getAiConnectionEncryptionSecret());
}

export async function getDefaultAiConnectionWithSecret(): Promise<RuntimeAiConnectionWithProvider | null> {
  const store = getAiConnectionStore();
  const connections = await store.listConnections();
  const defaultConnection = connections.find(
    (connection) => connection.isDefault && connection.active,
  );

  return buildRuntimeConnection(defaultConnection, getAiConnectionEncryptionSecret());
}

export async function listActiveAiConnectionsWithSecret(): Promise<
  RuntimeAiConnectionWithProvider[]
> {
  const store = getAiConnectionStore();
  const connections = await store.listConnections();
  const encryptionSecret = getAiConnectionEncryptionSecret();
  const runtimeConnections: RuntimeAiConnectionWithProvider[] = [];

  for (const connection of connections.filter((candidate) => candidate.active)) {
    try {
      const runtimeConnection = buildRuntimeConnection(
        connection,
        encryptionSecret,
      );

      if (runtimeConnection) {
        runtimeConnections.push(runtimeConnection);
      }
    } catch {
      // Skip malformed optional connections so one bad record does not block
      // GEO capability discovery for healthy active connections.
    }
  }

  return runtimeConnections;
}

export async function getDefaultAiConnectionPolicyWithSecret() {
  const store = getAiConnectionStore();
  const connections = await store.listConnections();
  const defaultConnection = connections.find(
    (connection) => connection.isDefault && connection.active,
  );

  if (!defaultConnection) {
    return null;
  }

  const encryptionSecret = getAiConnectionEncryptionSecret();
  const primaryConnection = buildRuntimeConnection(
    defaultConnection,
    encryptionSecret,
  );

  if (!primaryConnection) {
    return null;
  }

  const fallbackConnection = buildRuntimeConnection(
    connections.find(
      (candidate) =>
        candidate.id === defaultConnection.fallbackConnectionId && candidate.active,
    ),
    encryptionSecret,
  );

  return {
    primaryConnection,
    fallbackConnection,
  };
}

export async function createAiConnection(input: CreateAiConnectionInput) {
  const store = getAiConnectionStore();
  const nextConnection = buildStoredAiConnection(input);
  const existingConnections = await store.listConnections();
  const normalizedConnection = input.isDefault
    ? {
        ...nextConnection,
        isDefault: true,
      }
    : nextConnection;

  if (input.isDefault) {
    await Promise.all(
      existingConnections
        .filter((connection) => connection.isDefault)
        .map((connection) =>
          store.updateConnection(connection.id, (connections, existing) =>
            connections.map((candidate) =>
              candidate.id === existing.id
                ? {
                    ...candidate,
                    isDefault: false,
                    updatedAt: new Date().toISOString(),
                  }
                : candidate,
            ),
          ),
        ),
    );
  }

  const createdConnection = await store.createConnection(normalizedConnection);

  return sanitizeAiConnectionRecord(createdConnection);
}

export async function updateAiConnection(
  id: string,
  input: UpdateAiConnectionInput,
) {
  const store = getAiConnectionStore();
  const encryptionSecret = getAiConnectionEncryptionSecret();

  const nextConnection = await store.updateConnection(id, (connections, existing) => {
    const nextTimestamp = new Date().toISOString();
    const nextProviderType = input.providerType ?? existing.providerType;
    const nextVertexProjectId =
      input.vertexProjectId !== undefined
        ? input.vertexProjectId.trim()
        : existing.vertexProjectId?.trim() ?? "";
    const nextVertexLocation =
      input.vertexLocation !== undefined
        ? input.vertexLocation.trim()
        : existing.vertexLocation?.trim() ?? "";
    const nextServiceAccountEmail =
      input.serviceAccountEmail !== undefined
        ? input.serviceAccountEmail.trim()
        : existing.serviceAccountEmail?.trim() ?? "";
    const nextBaseUrl =
      input.baseUrl !== undefined || nextProviderType === "vertex-openai-compatible"
        ? buildConnectionBaseUrl(nextProviderType, {
            baseUrl: input.baseUrl ?? existing.baseUrl,
            vertexProjectId: nextVertexProjectId,
            vertexLocation: nextVertexLocation,
          })
        : existing.baseUrl;
    const nextApiKeyCiphertext =
      nextProviderType === "openai-compatible" &&
      input.apiKey &&
      encryptionSecret
        ? encryptAiConnectionApiKey(encryptionSecret, input.apiKey)
        : nextProviderType === "vertex-openai-compatible"
          ? ""
          : existing.apiKeyCiphertext;
    const nextApiKeyPreview =
      nextProviderType === "openai-compatible" &&
      input.apiKey &&
      encryptionSecret
        ? buildAiConnectionApiKeyPreview(input.apiKey)
        : nextProviderType === "vertex-openai-compatible"
          ? ""
          : existing.apiKeyPreview;
    const nextHasApiKey =
      nextProviderType === "openai-compatible"
        ? input.apiKey && encryptionSecret
          ? true
          : existing.hasApiKey
        : false;
    const nextConnectionRecord: StoredAiConnectionRecord = {
      ...existing,
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      providerType: nextProviderType,
      baseUrl: nextBaseUrl,
      ...(input.defaultModel !== undefined
        ? { defaultModel: input.defaultModel.trim() }
        : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
      ...(input.notes !== undefined ? { notes: input.notes.trim() } : {}),
      ...(input.fallbackConnectionId !== undefined
        ? { fallbackConnectionId: input.fallbackConnectionId.trim() }
        : {}),
      vertexProjectId: nextVertexProjectId,
      vertexLocation: nextVertexLocation,
      serviceAccountEmail: nextServiceAccountEmail,
      apiKeyCiphertext: nextApiKeyCiphertext,
      apiKeyPreview: nextApiKeyPreview,
      hasApiKey: nextHasApiKey,
      updatedAt: nextTimestamp,
    };

    return connections.map((connection) => {
      if (connection.id === id) {
        return nextConnectionRecord;
      }

      if (input.isDefault === true && connection.isDefault) {
        return {
          ...connection,
          isDefault: false,
          updatedAt: nextTimestamp,
        };
      }

      return connection;
    });
  });

  return nextConnection ? sanitizeAiConnectionRecord(nextConnection) : null;
}

type AiConnectionTestResultInput = {
  status: "success" | "failed";
  latencyMs: number;
  model?: string;
  errorMessage?: string;
  testedAt?: string;
};

export async function recordAiConnectionTestResult(
  id: string,
  input: AiConnectionTestResultInput,
) {
  const store = getAiConnectionStore();
  const testedAt = input.testedAt ?? new Date().toISOString();
  const connection = await store.updateConnection(id, (connections, existing) =>
    connections.map((candidate) =>
      candidate.id === existing.id
        ? {
            ...candidate,
            lastTestedAt: testedAt,
            lastTestStatus: input.status,
            lastTestLatencyMs: input.latencyMs,
            lastTestModel: input.model?.trim() || null,
            lastTestErrorMessage: input.errorMessage?.trim() || null,
            updatedAt: testedAt,
          }
        : candidate,
    ),
  );

  return connection ? sanitizeAiConnectionRecord(connection) : null;
}

type AiConnectionRuntimeResultInput = {
  connectionId: string;
  status: "success" | "failed" | "fallback-succeeded";
  latencyMs: number;
  model?: string;
  errorMessage?: string;
  runtimeAt?: string;
};

export async function recordAiConnectionRuntimeResult(
  input: AiConnectionRuntimeResultInput,
) {
  const store = getAiConnectionStore();
  const runtimeAt = input.runtimeAt ?? new Date().toISOString();
  const connection = await store.updateConnection(
    input.connectionId,
    (connections, existing) =>
      connections.map((candidate) =>
        candidate.id === existing.id
          ? {
              ...candidate,
              lastRuntimeAt: runtimeAt,
              lastRuntimeStatus: input.status,
              lastRuntimeLatencyMs: input.latencyMs,
              lastRuntimeModel: input.model?.trim() || null,
              lastRuntimeErrorMessage: input.errorMessage?.trim() || null,
              runtimeSuccessCount:
                (existing.runtimeSuccessCount ?? 0) +
                (input.status === "success" || input.status === "fallback-succeeded"
                  ? 1
                  : 0),
              runtimeFailureCount:
                (existing.runtimeFailureCount ?? 0) +
                (input.status === "failed" ? 1 : 0),
              runtimeFallbackCount:
                (existing.runtimeFallbackCount ?? 0) +
                (input.status === "fallback-succeeded" ? 1 : 0),
              lastFallbackAt:
                input.status === "fallback-succeeded"
                  ? runtimeAt
                  : existing.lastFallbackAt,
              updatedAt: runtimeAt,
            }
          : candidate,
      ),
  );

  return connection ? sanitizeAiConnectionRecord(connection) : null;
}

type TestAiConnectionDependencies = {
  fetchImpl?: typeof fetch;
  getVertexAccessToken?: typeof import("./vertex-ai-auth").getVertexAccessToken;
  now?: () => number;
};

export async function testAiConnection(
  id: string,
  dependencies: TestAiConnectionDependencies = {},
) {
  const connection = await getAiConnectionWithSecret(id);

  if (!connection) {
    throw new Error("We could not find that AI connection.");
  }

  const startedAt = dependencies.now?.() ?? Date.now();

  try {
    const { generateOpenAiCompatibleText } = await import("./ai-runtime");
    const result = await generateOpenAiCompatibleText({
      connection,
      developerPrompt:
        "You are performing a connectivity test for an AI connection. Reply with a short success message only.",
      userPrompt: "Say: Daily Sparks AI connection OK.",
      fetchImpl: dependencies.fetchImpl,
      getVertexAccessToken: dependencies.getVertexAccessToken,
    });
    const latencyMs = Math.max((dependencies.now?.() ?? Date.now()) - startedAt, 0);
    const updatedConnection = await recordAiConnectionTestResult(id, {
      status: "success",
      latencyMs,
      model: result.model,
      testedAt: new Date(startedAt).toISOString(),
    });

    return {
      connection: updatedConnection ?? stripRuntimeConnectionSecret(connection),
      status: "success" as const,
      model: result.model,
      latencyMs,
      textPreview: result.text.slice(0, 240),
    };
  } catch (error) {
    const latencyMs = Math.max((dependencies.now?.() ?? Date.now()) - startedAt, 0);
    const errorMessage =
      error instanceof Error ? error.message : "AI connection test failed.";
    const updatedConnection = await recordAiConnectionTestResult(id, {
      status: "failed",
      latencyMs,
      errorMessage,
      testedAt: new Date(startedAt).toISOString(),
    });

    return {
      connection: updatedConnection ?? stripRuntimeConnectionSecret(connection),
      status: "failed" as const,
      latencyMs,
      errorMessage,
      textPreview: "",
    };
  }
}

export async function deleteAiConnection(id: string) {
  return getAiConnectionStore().deleteConnection(id);
}
