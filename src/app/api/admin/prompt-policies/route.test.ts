import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { POST as adminLogin } from "../login/route";
import {
  GET as listPromptPoliciesRoute,
  POST as createPromptPolicyRoute,
  PUT as updatePromptPolicyRoute,
} from "./route";
import { EDITORIAL_ADMIN_SESSION_COOKIE_NAME } from "../../../../lib/editorial-admin-auth";

const ORIGINAL_ENV = { ...process.env };
let tempDirectory = "";
const validAdminSecret = "open-sesame";

function buildRequestBody(overrides: Record<string, unknown> = {}) {
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

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-prompt-policy-route-"),
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

describe("prompt policy admin route", () => {
  test("rejects unauthenticated requests", async () => {
    const response = await listPromptPoliciesRoute(
      new Request("http://localhost:3000/api/admin/prompt-policies"),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toMatch(/editorial admin/i);
  });

  test("lists, creates, and updates prompt policies for admins", async () => {
    const cookie = await signIn();

    const emptyListResponse = await listPromptPoliciesRoute(
      new Request("http://localhost:3000/api/admin/prompt-policies", {
        headers: { cookie },
      }),
    );
    const emptyListBody = await emptyListResponse.json();

    expect(emptyListResponse.status).toBe(200);
    expect(emptyListBody.policies).toEqual([]);

    const createResponse = await createPromptPolicyRoute(
      new Request("http://localhost:3000/api/admin/prompt-policies", {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify(buildRequestBody()),
      }),
    );
    const createBody = await createResponse.json();

    expect(createResponse.status).toBe(200);
    expect(createBody.policy.status).toBe("active");

    const secondCreateResponse = await createPromptPolicyRoute(
      new Request("http://localhost:3000/api/admin/prompt-policies", {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify(
          buildRequestBody({
            name: "Family Daily Sparks Core Refresh",
            versionLabel: "v1.1.0",
          }),
        ),
      }),
    );
    const secondCreateBody = await secondCreateResponse.json();

    expect(secondCreateResponse.status).toBe(200);
    expect(secondCreateBody.policy.status).toBe("draft");

    const updateResponse = await updatePromptPolicyRoute(
      new Request("http://localhost:3000/api/admin/prompt-policies", {
        method: "PUT",
        headers: {
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: secondCreateBody.policy.id,
          notes: "Prepared for activation.",
        }),
      }),
    );
    const updateBody = await updateResponse.json();

    expect(updateResponse.status).toBe(200);
    expect(updateBody.policy.notes).toBe("Prepared for activation.");
  });
});
