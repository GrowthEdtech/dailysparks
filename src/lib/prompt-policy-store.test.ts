import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  activatePromptPolicy,
  archivePromptPolicy,
  buildDefaultPromptPolicyInput,
  createPromptPolicy,
  duplicatePromptPolicy,
  getActivePromptPolicy,
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
  test("builds the stricter v1.1.1 default prompt policy template", () => {
    const defaultPolicy = buildDefaultPromptPolicyInput();

    expect(defaultPolicy.versionLabel).toBe("v2.0.0");
    expect(defaultPolicy.sharedInstructions).toMatch(/family-facing/i);
    expect(defaultPolicy.sharedInstructions).toMatch(/do not invent/i);
    expect(defaultPolicy.outputContractInstructions).toMatch(/valid JSON only/i);
    expect(defaultPolicy.outputContractInstructions).toMatch(/briefMarkdown/i);
    expect(defaultPolicy.outputContractInstructions).toMatch(/programme-specific section order/i);
    expect(defaultPolicy.outputContractInstructions).toMatch(/silently validate/i);
    expect(defaultPolicy.outputContractInstructions).toMatch(/non-empty/i);
    expect(defaultPolicy.pypInstructions).toMatch(/short sentences/i);
    expect(defaultPolicy.pypInstructions).toMatch(/reassuring/i);
    expect(defaultPolicy.pypInstructions).toMatch(/trusted adults|helpers/i);
    expect(defaultPolicy.mypInstructions).toMatch(/global context/i);
    expect(defaultPolicy.mypInstructions).toMatch(/inquiry question/i);
    expect(defaultPolicy.dpInstructions).toMatch(/3-sentence abstract/i);
    expect(defaultPolicy.dpInstructions).toMatch(/TOK \/ essay prompt/i);
    expect(defaultPolicy.dpInstructions).toMatch(/Notebook capture/i);
  });

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

  test("returns the active prompt policy for runtime use", async () => {
    const activePolicy = await createPromptPolicy(buildPolicyInput());
    await createPromptPolicy(
      buildPolicyInput({
        versionLabel: "v1.1.0",
      }),
    );

    const selectedPolicy = await getActivePromptPolicy();

    expect(selectedPolicy?.id).toBe(activePolicy.id);
    expect(selectedPolicy?.status).toBe("active");
  });

  test("returns null when no active prompt policy exists", async () => {
    expect(await getActivePromptPolicy()).toBeNull();
  });
});
