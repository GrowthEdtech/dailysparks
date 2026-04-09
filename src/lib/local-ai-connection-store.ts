import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  AiConnectionProviderType,
} from "./ai-connection-schema";
import type {
  AiConnectionStore,
  StoredAiConnectionRecord,
} from "./ai-connection-store-types";

type LocalAiConnectionStoreData = {
  connections: StoredAiConnectionRecord[];
};

function getStoreFilePath() {
  return (
    process.env.DAILY_SPARKS_AI_CONNECTION_STORE_PATH ??
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "data",
      "ai-connections.json",
    )
  );
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBoolean(value: unknown) {
  return value === true;
}

function normalizeProviderType(value: unknown): AiConnectionProviderType {
  return normalizeString(value) === "vertex-openai-compatible"
    ? "vertex-openai-compatible"
    : "openai-compatible";
}

function normalizeConnectionRecord(
  raw: Partial<StoredAiConnectionRecord> | undefined,
): StoredAiConnectionRecord {
  const timestamp = new Date().toISOString();

  return {
    id: normalizeString(raw?.id) || crypto.randomUUID(),
    name: normalizeString(raw?.name),
    providerType: normalizeProviderType(raw?.providerType),
    baseUrl: normalizeString(raw?.baseUrl),
    defaultModel: normalizeString(raw?.defaultModel),
    apiKeyCiphertext: normalizeString(raw?.apiKeyCiphertext),
    apiKeyPreview: normalizeString(raw?.apiKeyPreview),
    hasApiKey: normalizeBoolean(raw?.hasApiKey),
    active: normalizeBoolean(raw?.active),
    isDefault: normalizeBoolean(raw?.isDefault),
    notes: normalizeString(raw?.notes),
    fallbackConnectionId: normalizeString(raw?.fallbackConnectionId),
    vertexProjectId: normalizeString(raw?.vertexProjectId),
    vertexLocation: normalizeString(raw?.vertexLocation),
    serviceAccountEmail: normalizeString(raw?.serviceAccountEmail),
    lastTestedAt: normalizeString(raw?.lastTestedAt) || null,
    lastTestStatus:
      normalizeString(raw?.lastTestStatus) === "success" ||
      normalizeString(raw?.lastTestStatus) === "failed"
        ? (normalizeString(raw?.lastTestStatus) as "success" | "failed")
        : null,
    lastTestLatencyMs:
      typeof raw?.lastTestLatencyMs === "number" &&
      Number.isFinite(raw.lastTestLatencyMs)
        ? raw.lastTestLatencyMs
        : null,
    lastTestModel: normalizeString(raw?.lastTestModel) || null,
    lastTestErrorMessage: normalizeString(raw?.lastTestErrorMessage) || null,
    lastRuntimeAt: normalizeString(raw?.lastRuntimeAt) || null,
    lastRuntimeStatus:
      normalizeString(raw?.lastRuntimeStatus) === "success" ||
      normalizeString(raw?.lastRuntimeStatus) === "failed" ||
      normalizeString(raw?.lastRuntimeStatus) === "fallback-succeeded"
        ? (normalizeString(raw?.lastRuntimeStatus) as
            | "success"
            | "failed"
            | "fallback-succeeded")
        : null,
    lastRuntimeLatencyMs:
      typeof raw?.lastRuntimeLatencyMs === "number" &&
      Number.isFinite(raw.lastRuntimeLatencyMs)
        ? raw.lastRuntimeLatencyMs
        : null,
    lastRuntimeModel: normalizeString(raw?.lastRuntimeModel) || null,
    lastRuntimeErrorMessage:
      normalizeString(raw?.lastRuntimeErrorMessage) || null,
    runtimeSuccessCount:
      typeof raw?.runtimeSuccessCount === "number" &&
      Number.isFinite(raw.runtimeSuccessCount)
        ? raw.runtimeSuccessCount
        : 0,
    runtimeFailureCount:
      typeof raw?.runtimeFailureCount === "number" &&
      Number.isFinite(raw.runtimeFailureCount)
        ? raw.runtimeFailureCount
        : 0,
    runtimeFallbackCount:
      typeof raw?.runtimeFallbackCount === "number" &&
      Number.isFinite(raw.runtimeFallbackCount)
        ? raw.runtimeFallbackCount
        : 0,
    lastFallbackAt: normalizeString(raw?.lastFallbackAt) || null,
    createdAt: normalizeString(raw?.createdAt) || timestamp,
    updatedAt: normalizeString(raw?.updatedAt) || timestamp,
  };
}

async function readStore(): Promise<LocalAiConnectionStoreData> {
  const filePath = getStoreFilePath();

  try {
    const content = await readFile(filePath, "utf8");
    const parsed = JSON.parse(content) as {
      connections?: StoredAiConnectionRecord[];
    };

    return {
      connections: Array.isArray(parsed.connections)
        ? parsed.connections.map((connection) =>
            normalizeConnectionRecord(connection),
          )
        : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { connections: [] };
    }

    throw error;
  }
}

async function writeStore(store: LocalAiConnectionStoreData) {
  const filePath = getStoreFilePath();

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(store, null, 2));
}

export const localAiConnectionStore: AiConnectionStore = {
  async listConnections() {
    const store = await readStore();
    return store.connections;
  },

  async createConnection(record) {
    const store = await readStore();
    const nextStore = {
      connections: [...store.connections, normalizeConnectionRecord(record)],
    };

    await writeStore(nextStore);

    return normalizeConnectionRecord(record);
  },

  async updateConnection(id, updater) {
    const store = await readStore();
    const existingConnection = store.connections.find(
      (connection) => connection.id === id,
    );

    if (!existingConnection) {
      return null;
    }

    const nextConnections = updater(store.connections, existingConnection).map(
      (connection) => normalizeConnectionRecord(connection),
    );
    const nextConnection =
      nextConnections.find((connection) => connection.id === id) ?? null;

    await writeStore({ connections: nextConnections });

    return nextConnection;
  },

  async deleteConnection(id) {
    const store = await readStore();
    const nextConnections = store.connections.filter(
      (connection) => connection.id !== id,
    );

    if (nextConnections.length === store.connections.length) {
      return false;
    }

    await writeStore({ connections: nextConnections });
    return true;
  },
};
