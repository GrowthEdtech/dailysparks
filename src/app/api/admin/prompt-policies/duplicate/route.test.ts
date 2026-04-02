import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { POST as adminLogin } from "../../login/route";
import { POST as createPromptPolicyRoute } from "../route";
import { POST as duplicatePromptPolicyRoute } from "./route";
import { EDITORIAL_ADMIN_SESSION_COOKIE_NAME } from "../../../../../lib/editorial-admin-auth";

const ORIGINAL_ENV = { ...process.env };
let tempDirectory = "";
const validAdminSecret = "open-sesame";

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-prompt-policy-duplicate-"),
  );

  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_PROMPT_POLICY_STORE_PATH: path.join(
      tempDirectory,
      "prompt-policies.json",
    ),
    DAILY_SPARKS_EDITORIAL_ADMIN_PASSWORD: validAdminSecret,
    DAILY_SPARKS_EDITORIAL_ADMIN_SESSION_SECRET:
      "test-editorial-admin-session-secret",
  };
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

async function signIn() {
  const response = await adminLogin(
    new Request("http://localhost:3000/api/admin/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        password: validAdminSecret,
      }),
    }),
  );
  const setCookieHeader = response.headers.get("set-cookie") ?? "";
  const match = setCookieHeader.match(
    new RegExp(`${EDITORIAL_ADMIN_SESSION_COOKIE_NAME}=([^;]+)`),
  );

  return match
    ? `${EDITORIAL_ADMIN_SESSION_COOKIE_NAME}=${decodeURIComponent(match[1])}`
    : "";
}

describe("duplicate prompt policy route", () => {
  test("duplicates an existing prompt policy into a draft", async () => {
    const cookie = await signIn();

    const createResponse = await createPromptPolicyRoute(
      new Request("http://localhost:3000/api/admin/prompt-policies", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
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
        }),
      }),
    );
    const createBody = await createResponse.json();

    const duplicateResponse = await duplicatePromptPolicyRoute(
      new Request(
        "http://localhost:3000/api/admin/prompt-policies/duplicate",
        {
          method: "POST",
          headers: { cookie, "content-type": "application/json" },
          body: JSON.stringify({
            id: createBody.policy.id,
          }),
        },
      ),
    );
    const duplicateBody = await duplicateResponse.json();

    expect(duplicateResponse.status).toBe(200);
    expect(duplicateBody.policy.status).toBe("draft");
    expect(duplicateBody.policy.sharedInstructions).toBe(
      createBody.policy.sharedInstructions,
    );
  });
});
