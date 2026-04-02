import {
  DEFAULT_PROMPT_POLICY_TEMPLATE,
  type PromptPolicyRecord,
  type PromptPolicyResolvedPreviewByProgramme,
} from "./prompt-policy-schema";
import { firestorePromptPolicyStore } from "./firestore-prompt-policy-store";
import { localPromptPolicyStore } from "./local-prompt-policy-store";
import type {
  CreatePromptPolicyInput,
  PromptPolicyStore,
  UpdatePromptPolicyInput,
} from "./prompt-policy-store-types";
import {
  getProfileStoreBackend,
  validateProfileStoreConfig,
} from "./profile-store-config";

function getPromptPolicyStore(): PromptPolicyStore {
  validateProfileStoreConfig();

  return getProfileStoreBackend() === "firestore"
    ? firestorePromptPolicyStore
    : localPromptPolicyStore;
}

function getStatusPriority(status: PromptPolicyRecord["status"]) {
  if (status === "active") {
    return 0;
  }

  if (status === "draft") {
    return 1;
  }

  return 2;
}

function sortPolicies(policies: PromptPolicyRecord[]) {
  return [...policies].sort((left, right) => {
    const statusPriorityDelta =
      getStatusPriority(left.status) - getStatusPriority(right.status);

    if (statusPriorityDelta !== 0) {
      return statusPriorityDelta;
    }

    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

function trimInput(input: CreatePromptPolicyInput) {
  return {
    name: input.name.trim(),
    versionLabel: input.versionLabel.trim(),
    sharedInstructions: input.sharedInstructions.trim(),
    antiRepetitionInstructions: input.antiRepetitionInstructions.trim(),
    outputContractInstructions: input.outputContractInstructions.trim(),
    pypInstructions: input.pypInstructions.trim(),
    mypInstructions: input.mypInstructions.trim(),
    dpInstructions: input.dpInstructions.trim(),
    notes: input.notes.trim(),
  };
}

function trimPartialInput(input: UpdatePromptPolicyInput) {
  return {
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.versionLabel !== undefined
      ? { versionLabel: input.versionLabel.trim() }
      : {}),
    ...(input.sharedInstructions !== undefined
      ? { sharedInstructions: input.sharedInstructions.trim() }
      : {}),
    ...(input.antiRepetitionInstructions !== undefined
      ? { antiRepetitionInstructions: input.antiRepetitionInstructions.trim() }
      : {}),
    ...(input.outputContractInstructions !== undefined
      ? {
          outputContractInstructions: input.outputContractInstructions.trim(),
        }
      : {}),
    ...(input.pypInstructions !== undefined
      ? { pypInstructions: input.pypInstructions.trim() }
      : {}),
    ...(input.mypInstructions !== undefined
      ? { mypInstructions: input.mypInstructions.trim() }
      : {}),
    ...(input.dpInstructions !== undefined
      ? { dpInstructions: input.dpInstructions.trim() }
      : {}),
    ...(input.notes !== undefined ? { notes: input.notes.trim() } : {}),
  };
}

function buildDuplicateVersionLabel(versionLabel: string) {
  return `${versionLabel}-draft`;
}

export function buildDefaultPromptPolicyInput(
  overrides: Partial<CreatePromptPolicyInput> = {},
): CreatePromptPolicyInput {
  return {
    ...DEFAULT_PROMPT_POLICY_TEMPLATE,
    ...overrides,
  };
}

export function buildResolvedPromptPreview(
  policy: Pick<
    PromptPolicyRecord,
    | "sharedInstructions"
    | "antiRepetitionInstructions"
    | "outputContractInstructions"
    | "pypInstructions"
    | "mypInstructions"
    | "dpInstructions"
  >,
  programme: "PYP" | "MYP" | "DP",
) {
  const programmeInstructions =
    programme === "PYP"
      ? policy.pypInstructions
      : programme === "MYP"
        ? policy.mypInstructions
        : policy.dpInstructions;

  return [
    "Shared instructions",
    policy.sharedInstructions,
    "",
    "Anti-repetition instructions",
    policy.antiRepetitionInstructions,
    "",
    `${programme} instructions`,
    programmeInstructions,
    "",
    "Output contract",
    policy.outputContractInstructions,
  ].join("\n");
}

export function buildResolvedPromptPreviewByProgramme(
  policy: Pick<
    PromptPolicyRecord,
    | "sharedInstructions"
    | "antiRepetitionInstructions"
    | "outputContractInstructions"
    | "pypInstructions"
    | "mypInstructions"
    | "dpInstructions"
  >,
): PromptPolicyResolvedPreviewByProgramme {
  return {
    PYP: buildResolvedPromptPreview(policy, "PYP"),
    MYP: buildResolvedPromptPreview(policy, "MYP"),
    DP: buildResolvedPromptPreview(policy, "DP"),
  };
}

export async function listPromptPolicies() {
  return sortPolicies(await getPromptPolicyStore().listPolicies());
}

export async function getPromptPolicy(id: string) {
  return getPromptPolicyStore().getPolicy(id);
}

export async function createPromptPolicy(input: CreatePromptPolicyInput) {
  const trimmedInput = trimInput(input);
  const store = getPromptPolicyStore();
  const existingPolicies = await store.listPolicies();
  const activePolicy = existingPolicies.find((policy) => policy.status === "active");
  const timestamp = new Date().toISOString();
  const nextPolicy: PromptPolicyRecord = {
    id: crypto.randomUUID(),
    ...trimmedInput,
    status: activePolicy ? "draft" : "active",
    createdAt: timestamp,
    updatedAt: timestamp,
    activatedAt: activePolicy ? null : timestamp,
  };

  return store.createPolicy(nextPolicy);
}

export async function updatePromptPolicy(
  id: string,
  input: UpdatePromptPolicyInput,
) {
  const store = getPromptPolicyStore();
  const existingPolicy = await store.getPolicy(id);

  if (!existingPolicy || existingPolicy.status !== "draft") {
    return null;
  }

  const trimmedInput = trimPartialInput(input);

  return store.updatePolicy(id, (policies, currentPolicy) =>
    policies.map((policy) =>
      policy.id === currentPolicy.id
        ? {
            ...policy,
            ...trimmedInput,
            updatedAt: new Date().toISOString(),
          }
        : policy,
    ),
  );
}

export async function activatePromptPolicy(id: string) {
  const store = getPromptPolicyStore();
  const existingPolicy = await store.getPolicy(id);

  if (!existingPolicy || existingPolicy.status !== "draft") {
    return null;
  }

  const timestamp = new Date().toISOString();

  return store.updatePolicy(id, (policies, currentPolicy) =>
    policies.map((policy) => {
      if (policy.id === currentPolicy.id) {
        return {
          ...policy,
          status: "active",
          updatedAt: timestamp,
          activatedAt: timestamp,
        };
      }

      if (policy.status === "active") {
        return {
          ...policy,
          status: "archived",
          updatedAt: timestamp,
        };
      }

      return policy;
    }),
  );
}

export async function duplicatePromptPolicy(id: string) {
  const store = getPromptPolicyStore();
  const existingPolicy = await store.getPolicy(id);

  if (!existingPolicy) {
    return null;
  }

  const timestamp = new Date().toISOString();
  const duplicatedPolicy: PromptPolicyRecord = {
    ...existingPolicy,
    id: crypto.randomUUID(),
    versionLabel: buildDuplicateVersionLabel(existingPolicy.versionLabel),
    status: "draft",
    createdAt: timestamp,
    updatedAt: timestamp,
    activatedAt: null,
  };

  return store.createPolicy(duplicatedPolicy);
}

export async function archivePromptPolicy(id: string) {
  const store = getPromptPolicyStore();
  const existingPolicy = await store.getPolicy(id);

  if (!existingPolicy || existingPolicy.status !== "draft") {
    return null;
  }

  return store.updatePolicy(id, (policies, currentPolicy) =>
    policies.map((policy) =>
      policy.id === currentPolicy.id
        ? {
            ...policy,
            status: "archived",
            updatedAt: new Date().toISOString(),
          }
        : policy,
    ),
  );
}
