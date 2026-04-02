import { getFirebaseAdminDb } from "./firebase-admin";
import type {
  CreateEditorialSourceInput,
  EditorialSourceRecord,
  EditorialSourceStore,
} from "./editorial-source-store";
import { createSeededEditorialSources } from "./editorial-source-store";
import type { Programme } from "./mvp-types";
import type {
  EditorialSourceRole,
  EditorialUsageTier,
} from "./editorial-policy";

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

function isProgramme(value: string): value is Programme {
  return value === "PYP" || value === "MYP" || value === "DP";
}

function normalizeProgrammeList(value: unknown) {
  return normalizeStringList(value).filter((item): item is Programme =>
    isProgramme(item),
  );
}

function isEditorialSourceRole(value: string): value is EditorialSourceRole {
  return (
    value === "daily-news" ||
    value === "explainer" ||
    value === "pyp-friendly" ||
    value === "source-of-record"
  );
}

function normalizeRoleList(value: unknown) {
  return normalizeStringList(value).filter((item): item is EditorialSourceRole =>
    isEditorialSourceRole(item),
  );
}

function isEditorialUsageTier(value: string): value is EditorialUsageTier {
  return (
    value === "primary-selection" ||
    value === "background-context" ||
    value === "fact-check"
  );
}

function normalizeUsageTierList(value: unknown) {
  return normalizeStringList(value).filter((item): item is EditorialUsageTier =>
    isEditorialUsageTier(item),
  );
}

function normalizeBoolean(value: unknown) {
  return value === true;
}

function normalizeSourceRecord(
  id: string,
  raw: Partial<EditorialSourceRecord> | undefined,
): EditorialSourceRecord {
  const timestamp = new Date().toISOString();

  return {
    id,
    name: normalizeString(raw?.name),
    domain: normalizeString(raw?.domain).toLowerCase(),
    homepage: normalizeString(raw?.homepage),
    roles: normalizeRoleList(raw?.roles),
    usageTiers: normalizeUsageTierList(raw?.usageTiers),
    recommendedProgrammes: normalizeProgrammeList(raw?.recommendedProgrammes),
    sections: normalizeStringList(raw?.sections),
    ingestionMode:
      normalizeString(raw?.ingestionMode) === "summary-link"
        ? "summary-link"
        : "metadata-only",
    active: normalizeBoolean(raw?.active),
    notes: normalizeString(raw?.notes),
    seededFromPolicy: normalizeBoolean(raw?.seededFromPolicy),
    createdAt: normalizeString(raw?.createdAt) || timestamp,
    updatedAt: normalizeString(raw?.updatedAt) || timestamp,
  };
}

function createSourceRecord(
  sourceId: string,
  input: CreateEditorialSourceInput,
): EditorialSourceRecord {
  const timestamp = new Date().toISOString();

  return normalizeSourceRecord(sourceId, {
    ...input,
    seededFromPolicy: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

async function seedIfEmpty() {
  const db = getFirebaseAdminDb();
  const collection = db.collection("editorialSources");
  const snapshot = await collection.limit(1).get();

  if (!snapshot.empty) {
    return;
  }

  const seededSources = createSeededEditorialSources();
  const batch = db.batch();

  for (const source of seededSources) {
    batch.set(collection.doc(source.id), source);
  }

  await batch.commit();
}

export const firestoreEditorialSourceStore: EditorialSourceStore = {
  async listSources() {
    await seedIfEmpty();

    const db = getFirebaseAdminDb();
    const snapshot = await db.collection("editorialSources").get();

    return snapshot.docs.map((document) =>
      normalizeSourceRecord(
        document.id,
        document.data() as Partial<EditorialSourceRecord> | undefined,
      ),
    );
  },

  async createSource(input) {
    const db = getFirebaseAdminDb();
    const document = db.collection("editorialSources").doc();
    const nextSource = createSourceRecord(document.id, input);

    await document.set(nextSource);

    return nextSource;
  },

  async updateSource(id, input) {
    const db = getFirebaseAdminDb();
    const document = db.collection("editorialSources").doc(id);
    const snapshot = await document.get();

    if (!snapshot.exists) {
      return null;
    }

    const existingSource = normalizeSourceRecord(
      snapshot.id,
      snapshot.data() as Partial<EditorialSourceRecord> | undefined,
    );
    const nextSource = normalizeSourceRecord(snapshot.id, {
      ...existingSource,
      ...input,
      seededFromPolicy: existingSource.seededFromPolicy,
      createdAt: existingSource.createdAt,
      updatedAt: new Date().toISOString(),
    });

    await document.set(nextSource);

    return nextSource;
  },
};
