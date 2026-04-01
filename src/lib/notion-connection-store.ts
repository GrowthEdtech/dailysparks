import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { MvpStoreData, NotionConnectionSecretRecord } from "./mvp-types";
import { getFirebaseAdminDb } from "./firebase-admin";
import { getProfileStoreBackend } from "./profile-store-config";

function getStoreFilePath() {
  return (
    process.env.DAILY_SPARKS_STORE_PATH ??
    path.join(/* turbopackIgnore: true */ process.cwd(), "data", "mvp-store.json")
  );
}

function createEmptyStore(): MvpStoreData {
  return {
    parents: [],
    students: [],
    notionConnections: [],
  };
}

function normalizeNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeConnection(
  raw: Record<string, unknown>,
): NotionConnectionSecretRecord | null {
  const timestamp = new Date().toISOString();
  const parentId =
    typeof raw.parentId === "string" && raw.parentId.trim() ? raw.parentId.trim() : "";
  const accessTokenCiphertext =
    typeof raw.accessTokenCiphertext === "string" && raw.accessTokenCiphertext.trim()
      ? raw.accessTokenCiphertext.trim()
      : "";
  const workspaceId =
    typeof raw.workspaceId === "string" && raw.workspaceId.trim()
      ? raw.workspaceId.trim()
      : "";
  const botId =
    typeof raw.botId === "string" && raw.botId.trim() ? raw.botId.trim() : "";

  if (!parentId || !accessTokenCiphertext || !workspaceId || !botId) {
    return null;
  }

  return {
    parentId,
    accessTokenCiphertext,
    refreshTokenCiphertext: normalizeNullableString(raw.refreshTokenCiphertext),
    workspaceId,
    botId,
    expiresAt: normalizeNullableString(raw.expiresAt),
    createdAt:
      typeof raw.createdAt === "string" && raw.createdAt.trim()
        ? raw.createdAt
        : timestamp,
    updatedAt:
      typeof raw.updatedAt === "string" && raw.updatedAt.trim()
        ? raw.updatedAt
        : timestamp,
  };
}

function normalizeStore(store: unknown): MvpStoreData {
  const rawStore =
    typeof store === "object" && store !== null ? (store as Record<string, unknown>) : {};

  const notionConnections = Array.isArray(rawStore.notionConnections)
    ? rawStore.notionConnections
        .map((record) =>
          normalizeConnection((record ?? {}) as Record<string, unknown>),
        )
        .filter((record): record is NotionConnectionSecretRecord => record !== null)
    : [];

  return {
    parents: Array.isArray(rawStore.parents) ? (rawStore.parents as MvpStoreData["parents"]) : [],
    students: Array.isArray(rawStore.students)
      ? (rawStore.students as MvpStoreData["students"])
      : [],
    notionConnections,
  };
}

async function readLocalStore() {
  const filePath = getStoreFilePath();

  try {
    const content = await readFile(filePath, "utf8");
    return normalizeStore(JSON.parse(content) as unknown);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return createEmptyStore();
    }

    throw error;
  }
}

async function writeLocalStore(store: MvpStoreData) {
  const filePath = getStoreFilePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(store, null, 2));
}

export async function getNotionConnectionSecret(parentId: string) {
  if (getProfileStoreBackend() === "firestore") {
    const snapshot = await getFirebaseAdminDb()
      .collection("notionConnections")
      .doc(parentId)
      .get();

    if (!snapshot.exists) {
      return null;
    }

    return normalizeConnection(
      (snapshot.data() ?? {}) as Record<string, unknown>,
    );
  }

  const store = await readLocalStore();
  return (
    store.notionConnections.find((connection) => connection.parentId === parentId) ?? null
  );
}

export async function setNotionConnectionSecret(
  record: NotionConnectionSecretRecord,
) {
  if (getProfileStoreBackend() === "firestore") {
    await getFirebaseAdminDb()
      .collection("notionConnections")
      .doc(record.parentId)
      .set(record);

    return;
  }

  const store = await readLocalStore();
  const nextConnections = store.notionConnections.filter(
    (connection) => connection.parentId !== record.parentId,
  );
  nextConnections.push(record);
  await writeLocalStore({
    ...store,
    notionConnections: nextConnections,
  });
}

export async function clearNotionConnectionSecret(parentId: string) {
  if (getProfileStoreBackend() === "firestore") {
    await getFirebaseAdminDb().collection("notionConnections").doc(parentId).delete();
    return;
  }

  const store = await readLocalStore();
  await writeLocalStore({
    ...store,
    notionConnections: store.notionConnections.filter(
      (connection) => connection.parentId !== parentId,
    ),
  });
}
