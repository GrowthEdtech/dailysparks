import {
  buildAiConnectionApiKeyPreview,
  decryptAiConnectionApiKey,
  encryptAiConnectionApiKey,
  getAiConnectionEncryptionSecret,
} from "./ai-connection-crypto";
import type { AiConnectionRecord } from "./ai-connection-schema";
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
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,
  };
}

export type RuntimeAiConnection = AiConnectionRecord & {
  apiKey: string;
};

function buildStoredAiConnection(
  input: CreateAiConnectionInput,
): StoredAiConnectionRecord {
  const encryptionSecret = getAiConnectionEncryptionSecret();

  if (!encryptionSecret) {
    throw new Error("AI connection encryption secret is not configured.");
  }

  const timestamp = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    providerType: input.providerType,
    baseUrl: input.baseUrl.trim(),
    defaultModel: input.defaultModel.trim(),
    apiKeyCiphertext: encryptAiConnectionApiKey(encryptionSecret, input.apiKey),
    apiKeyPreview: buildAiConnectionApiKeyPreview(input.apiKey),
    hasApiKey: true,
    active: input.active,
    isDefault: input.isDefault,
    notes: input.notes.trim(),
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

export async function getDefaultAiConnectionWithSecret(): Promise<RuntimeAiConnection | null> {
  const encryptionSecret = getAiConnectionEncryptionSecret();

  if (!encryptionSecret) {
    return null;
  }

  const store = getAiConnectionStore();
  const connections = await store.listConnections();
  const defaultConnection = connections.find(
    (connection) => connection.isDefault && connection.active,
  );

  if (!defaultConnection) {
    return null;
  }

  return {
    ...sanitizeAiConnectionRecord(defaultConnection),
    apiKey: decryptAiConnectionApiKey(
      encryptionSecret,
      defaultConnection.apiKeyCiphertext,
    ),
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
    const nextApiKeyCiphertext =
      input.apiKey && encryptionSecret
        ? encryptAiConnectionApiKey(encryptionSecret, input.apiKey)
        : existing.apiKeyCiphertext;
    const nextApiKeyPreview =
      input.apiKey && encryptionSecret
        ? buildAiConnectionApiKeyPreview(input.apiKey)
        : existing.apiKeyPreview;
    const nextHasApiKey =
      input.apiKey && encryptionSecret ? true : existing.hasApiKey;
    const nextConnectionRecord: StoredAiConnectionRecord = {
      ...existing,
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.providerType !== undefined
        ? { providerType: input.providerType }
        : {}),
      ...(input.baseUrl !== undefined ? { baseUrl: input.baseUrl.trim() } : {}),
      ...(input.defaultModel !== undefined
        ? { defaultModel: input.defaultModel.trim() }
        : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
      ...(input.notes !== undefined ? { notes: input.notes.trim() } : {}),
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
