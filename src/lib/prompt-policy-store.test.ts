import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  activatePromptPolicy,
  archivePromptPolicy,
  createPromptPolicy,
  duplicatePromptPolicy,
  getPromptPolicy,
  listPromptPolicies,
  updatePromptPolicy,
} from "./prompt-policy-store";

const ORIGINAL_ENV = { ...process.env };

function buildPolicyInput(
  overrides: Partial<Parameters<typeof createPromptPolicy>[0]> = {},
) {
  return {
    name: "Family Daily Sparks Core",
    versionLabel: "v1.0.0",
    sharedInstructions: "Use family-friendly language and cite core facts.",
    antiRepetitionInstructions:
      "Avoid repeating the same angle used in the past 14 days.",
    outputContractInstructions:
      "Return headline, summary, source references, and discussion prompts.",
    pypInstructions: "Use concrete examples and short sentences.",
    mypInstructions: "Add comparison, cause, and consequence framing.",
    dpInstructions: "Add analytical tension, evidence limits, and nuance.",
    notes: "Initial house prompt policy.",
    ...overrides,
  };
}

let tempDirectory = "";

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-prompt-policy-store-"),
  );

  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_PROMPT_POLICY_STORE_PATH: path.join(
      tempDirectory,
      "prompt-policies.json",
    ),
  };
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("prompt policy store", () => {
  test("returns an empty list before any prompt policies are recorded", async () => {
    expect(await listPromptPolicies()).toEqual([]);
  });

  test("creates the first prompt policy as active and fetches it by id", async () => {
    const createdPolicy = await createPromptPolicy(buildPolicyInput());
    const fetchedPolicy = await getPromptPolicy(createdPolicy.id);

    expect(createdPolicy.status).toBe("active");
    expect(fetchedPolicy?.versionLabel).toBe("v1.0.0");
  });

  test("activates a draft and archives the previous active policy", async () => {
    const activePolicy = await createPromptPolicy(buildPolicyInput());
    const draftPolicy = await createPromptPolicy(
      buildPolicyInput({
        name: "Family Daily Sparks Core Refresh",
        versionLabel: "v1.1.0",
      }),
    );

    const nextActivePolicy = await activatePromptPolicy(draftPolicy.id);
    const policies = await listPromptPolicies();

    expect(draftPolicy.status).toBe("draft");
    expect(nextActivePolicy?.status).toBe("active");
    expect(
      policies.find((policy) => policy.id === activePolicy.id)?.status,
    ).toBe("archived");
  });

  test("duplicates an existing policy into a new draft and archives drafts", async () => {
    const activePolicy = await createPromptPolicy(buildPolicyInput());
    const duplicatedPolicy = await duplicatePromptPolicy(activePolicy.id);

    expect(duplicatedPolicy?.status).toBe("draft");
    expect(duplicatedPolicy?.sharedInstructions).toBe(
      activePolicy.sharedInstructions,
    );

    const archivedPolicy = await archivePromptPolicy(duplicatedPolicy!.id);
    const updatedPolicy = await updatePromptPolicy(duplicatedPolicy!.id, {
      notes: "This should not save after archive.",
    });

    expect(archivedPolicy?.status).toBe("archived");
    expect(updatedPolicy).toBeNull();
  });
});
