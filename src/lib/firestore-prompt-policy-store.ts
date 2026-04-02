import { getFirebaseAdminDb } from "./firebase-admin";
import {
  PROMPT_POLICY_STATUSES,
  type PromptPolicyRecord,
  type PromptPolicyStatus,
} from "./prompt-policy-schema";
import type { PromptPolicyStore } from "./prompt-policy-store-types";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value: unknown): PromptPolicyStatus {
  const normalized = normalizeString(value);
  return PROMPT_POLICY_STATUSES.includes(normalized as PromptPolicyStatus)
    ? (normalized as PromptPolicyStatus)
    : "draft";
}

function normalizePolicyRecord(
  id: string,
  raw: Partial<PromptPolicyRecord> | undefined,
): PromptPolicyRecord {
  const timestamp = new Date().toISOString();

  return {
    id,
    name: normalizeString(raw?.name),
    versionLabel: normalizeString(raw?.versionLabel),
    status: normalizeStatus(raw?.status),
    sharedInstructions: normalizeString(raw?.sharedInstructions),
    antiRepetitionInstructions: normalizeString(raw?.antiRepetitionInstructions),
    outputContractInstructions: normalizeString(raw?.outputContractInstructions),
    pypInstructions: normalizeString(raw?.pypInstructions),
    mypInstructions: normalizeString(raw?.mypInstructions),
    dpInstructions: normalizeString(raw?.dpInstructions),
    notes: normalizeString(raw?.notes),
    createdAt: normalizeString(raw?.createdAt) || timestamp,
    updatedAt: normalizeString(raw?.updatedAt) || timestamp,
    activatedAt: normalizeString(raw?.activatedAt) || null,
  };
}

export const firestorePromptPolicyStore: PromptPolicyStore = {
  async listPolicies() {
    const snapshot = await getFirebaseAdminDb()
      .collection("editorialPromptPolicies")
      .get();

    return snapshot.docs.map((document) =>
      normalizePolicyRecord(
        document.id,
        document.data() as Partial<PromptPolicyRecord> | undefined,
      ),
    );
  },

  async getPolicy(id) {
    const document = await getFirebaseAdminDb()
      .collection("editorialPromptPolicies")
      .doc(id)
      .get();

    if (!document.exists) {
      return null;
    }

    return normalizePolicyRecord(
      document.id,
      document.data() as Partial<PromptPolicyRecord> | undefined,
    );
  },

  async createPolicy(record) {
    const nextPolicy = normalizePolicyRecord(record.id, record);

    await getFirebaseAdminDb()
      .collection("editorialPromptPolicies")
      .doc(nextPolicy.id)
      .set(nextPolicy);

    return nextPolicy;
  },

  async updatePolicy(id, updater) {
    const db = getFirebaseAdminDb();
    const collection = db.collection("editorialPromptPolicies");
    const snapshot = await collection.get();
    const policies = snapshot.docs.map((document) =>
      normalizePolicyRecord(
        document.id,
        document.data() as Partial<PromptPolicyRecord> | undefined,
      ),
    );
    const existingPolicy = policies.find((policy) => policy.id === id);

    if (!existingPolicy) {
      return null;
    }

    const nextPolicies = updater(policies, existingPolicy).map((policy) =>
      normalizePolicyRecord(policy.id, policy),
    );
    const batch = db.batch();

    for (const policy of nextPolicies) {
      batch.set(collection.doc(policy.id), policy);
    }

    await batch.commit();

    return nextPolicies.find((policy) => policy.id === id) ?? null;
  },
};
