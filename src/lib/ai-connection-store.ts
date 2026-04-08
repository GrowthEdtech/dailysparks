import {
  buildAiConnectionApiKeyPreview,
  decryptAiConnectionApiKey,
  encryptAiConnectionApiKey,
  getAiConnectionEncryptionSecret,
} from "./ai-connection-crypto";
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
    vertexProjectId: connection.vertexProjectId,
    vertexLocation: connection.vertexLocation,
    serviceAccountEmail: connection.serviceAccountEmail,
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

  if (input.providerType === "vertex-openai-compatible") {
    return {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      providerType: input.providerType,
      baseUrl: nextBaseUrl,
      defaultModel: input.defaultModel.trim(),
      apiKeyCiphertext: "",
      apiKeyPreview: "",
      hasApiKey: false,
      active: input.active,
      isDefault: input.isDefault,
      notes: input.notes.trim(),
      vertexProjectId: nextVertexProjectId,
      vertexLocation: nextVertexLocation,
      serviceAccountEmail: nextServiceAccountEmail,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  const encryptionSecret = getAiConnectionEncryptionSecret();

  if (!encryptionSecret) {
    throw new Error("AI connection encryption secret is not configured.");
  }

  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    providerType: input.providerType,
    baseUrl: nextBaseUrl,
    defaultModel: input.defaultModel.trim(),
    apiKeyCiphertext: encryptAiConnectionApiKey(encryptionSecret, input.apiKey),
    apiKeyPreview: buildAiConnectionApiKeyPreview(input.apiKey),
    hasApiKey: true,
    active: input.active,
    isDefault: input.isDefault,
    notes: input.notes.trim(),
    vertexProjectId: nextVertexProjectId,
    vertexLocation: nextVertexLocation,
    serviceAccountEmail: nextServiceAccountEmail,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function listAiConnections() {
  const store = getAiConnectionStore();
  const connections = await store.listConnections();

  return connections.map((connection) => sanitizeAiConnectionRecord(connection));
}

export async function getDefaultAiConnection() {
  const store = getAiConnectionStore();
  const connections = await store.listConnections();
  const defaultConnection = connections.find(
    (connection) => connection.isDefault && connection.active,
  );

  return defaultConnection ? sanitizeAiConnectionRecord(defaultConnection) : null;
}

export async function getDefaultAiConnectionWithSecret(): Promise<RuntimeAiConnectionWithProvider | null> {
  const encryptionSecret = getAiConnectionEncryptionSecret();

  const store = getAiConnectionStore();
  const connections = await store.listConnections();
  const defaultConnection = connections.find(
    (connection) => connection.isDefault && connection.active,
  );

  if (!defaultConnection) {
    return null;
  }

  if (defaultConnection.providerType === "vertex-openai-compatible") {
    return sanitizeAiConnectionRecord(defaultConnection) as RuntimeVertexAiConnection;
  }

  if (!encryptionSecret) {
    return null;
  }

  return {
    ...sanitizeAiConnectionRecord(defaultConnection),
    apiKey: decryptAiConnectionApiKey(
      encryptionSecret,
      defaultConnection.apiKeyCiphertext,
    ),
  } as RuntimeOpenAiCompatibleConnection;
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

export async function deleteAiConnection(id: string) {
  return getAiConnectionStore().deleteConnection(id);
}
