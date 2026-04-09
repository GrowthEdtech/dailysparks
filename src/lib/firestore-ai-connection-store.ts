import { getFirebaseAdminDb } from "./firebase-admin";
import type {
  AiConnectionProviderType,
} from "./ai-connection-schema";
import type {
  AiConnectionStore,
  StoredAiConnectionRecord,
} from "./ai-connection-store-types";

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
  id: string,
  raw: Partial<StoredAiConnectionRecord> | undefined,
): StoredAiConnectionRecord {
  const timestamp = new Date().toISOString();

  return {
    id,
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

export const firestoreAiConnectionStore: AiConnectionStore = {
  async listConnections() {
    const snapshot = await getFirebaseAdminDb()
      .collection("editorialAiConnections")
      .get();

    return snapshot.docs.map((document) =>
      normalizeConnectionRecord(
        document.id,
        document.data() as Partial<StoredAiConnectionRecord> | undefined,
      ),
    );
  },

  async createConnection(record) {
    const db = getFirebaseAdminDb();
    const document = db.collection("editorialAiConnections").doc(record.id);
    const nextConnection = normalizeConnectionRecord(record.id, record);

    await document.set(nextConnection);

    return nextConnection;
  },

  async updateConnection(id, updater) {
    const db = getFirebaseAdminDb();
    const collection = db.collection("editorialAiConnections");
    const snapshot = await collection.get();
    const connections = snapshot.docs.map((document) =>
      normalizeConnectionRecord(
        document.id,
        document.data() as Partial<StoredAiConnectionRecord> | undefined,
      ),
    );
    const existingConnection = connections.find((connection) => connection.id === id);

    if (!existingConnection) {
      return null;
    }

    const nextConnections = updater(connections, existingConnection).map(
      (connection) =>
        normalizeConnectionRecord(connection.id, connection),
    );
    const batch = db.batch();

    for (const connection of nextConnections) {
      batch.set(collection.doc(connection.id), connection);
    }

    await batch.commit();

    return nextConnections.find((connection) => connection.id === id) ?? null;
  },

  async deleteConnection(id) {
    const db = getFirebaseAdminDb();
    const document = db.collection("editorialAiConnections").doc(id);
    const snapshot = await document.get();

    if (!snapshot.exists) {
      return false;
    }

    await document.delete();
    return true;
  },
};
