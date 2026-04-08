import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { POST as adminLogin } from "../login/route";
import {
  DELETE as deleteAiConnectionRoute,
  GET as listAiConnectionsRoute,
  POST as createAiConnectionRoute,
  PUT as updateAiConnectionRoute,
} from "./route";
import { EDITORIAL_ADMIN_SESSION_COOKIE_NAME } from "../../../../lib/editorial-admin-auth";

const ORIGINAL_ENV = { ...process.env };
let tempDirectory = "";
const validAdminSecret = "open-sesame";
const CREATED_CONNECTION_TEST_API_KEY = "test-key-example-1234567890";
const UPDATED_CONNECTION_TEST_API_KEY = "test-key-replaced-1234564321";
const VERTEX_SERVICE_ACCOUNT_EMAIL =
  "automation-agent@gen-lang-client-0586185740.iam.gserviceaccount.com";

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-ai-connections-route-"),
  );
  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_AI_CONNECTION_STORE_PATH: path.join(
      tempDirectory,
      "ai-connections.json",
    ),
    DAILY_SPARKS_EDITORIAL_ADMIN_PASSWORD: validAdminSecret,
    DAILY_SPARKS_EDITORIAL_ADMIN_SESSION_SECRET:
      "test-editorial-admin-session-secret",
    DAILY_SPARKS_AI_CONFIG_ENCRYPTION_SECRET:
      "test-ai-connection-encryption-secret",
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

describe("AI connections admin route", () => {
  test("rejects unauthenticated requests", async () => {
    const response = await listAiConnectionsRoute(
      new Request("http://localhost:3000/api/admin/ai-connections"),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toMatch(/editorial admin/i);
  });

  test("lists, creates, updates, and deletes AI connections for admins", async () => {
    const cookie = await signIn();

    const emptyListResponse = await listAiConnectionsRoute(
      new Request("http://localhost:3000/api/admin/ai-connections", {
        headers: { cookie },
      }),
    );
    const emptyListBody = await emptyListResponse.json();

    expect(emptyListResponse.status).toBe(200);
    expect(emptyListBody.connections).toEqual([]);

    const createResponse = await createAiConnectionRoute(
      new Request("http://localhost:3000/api/admin/ai-connections", {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "NF Relay",
          providerType: "openai-compatible",
          baseUrl: "https://relay.nf.video/v1",
          defaultModel: "gpt-5.4",
          apiKey: CREATED_CONNECTION_TEST_API_KEY,
          active: true,
          isDefault: true,
          notes: "Primary relay connection.",
        }),
      }),
    );
    const createBody = await createResponse.json();

    expect(createResponse.status).toBe(200);
    expect(createBody.connection.apiKeyPreview).toBe("••••••••7890");

    const updateResponse = await updateAiConnectionRoute(
      new Request("http://localhost:3000/api/admin/ai-connections", {
        method: "PUT",
        headers: {
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: createBody.connection.id,
          defaultModel: "gpt-5.4-mini",
          notes: "Switched to a lighter model.",
          apiKey: UPDATED_CONNECTION_TEST_API_KEY,
        }),
      }),
    );
    const updateBody = await updateResponse.json();

    expect(updateResponse.status).toBe(200);
    expect(updateBody.connection.defaultModel).toBe("gpt-5.4-mini");
    expect(updateBody.connection.apiKeyPreview).toBe("••••••••4321");

    const deleteResponse = await deleteAiConnectionRoute(
      new Request("http://localhost:3000/api/admin/ai-connections", {
        method: "DELETE",
        headers: {
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: createBody.connection.id,
        }),
      }),
    );
    const deleteBody = await deleteResponse.json();

    expect(deleteResponse.status).toBe(200);
    expect(deleteBody.success).toBe(true);
  });

  test("creates a Vertex AI connection without requiring an API key", async () => {
    const cookie = await signIn();

    const createResponse = await createAiConnectionRoute(
      new Request("http://localhost:3000/api/admin/ai-connections", {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "Vertex Gemini",
          providerType: "vertex-openai-compatible",
          defaultModel: "google/gemini-3.1-pro-preview",
          active: true,
          isDefault: true,
          notes: "Default Gemini connection.",
          vertexProjectId: "gen-lang-client-0586185740",
          vertexLocation: "global",
          serviceAccountEmail: VERTEX_SERVICE_ACCOUNT_EMAIL,
        }),
      }),
    );
    const createBody = await createResponse.json();

    expect(createResponse.status).toBe(200);
    expect(createBody.connection.hasApiKey).toBe(false);
    expect(createBody.connection.vertexProjectId).toBe(
      "gen-lang-client-0586185740",
    );
    expect(createBody.connection.vertexLocation).toBe("global");
    expect(createBody.connection.serviceAccountEmail).toBe(
      VERTEX_SERVICE_ACCOUNT_EMAIL,
    );
    expect(createBody.connection.baseUrl).toBe(
      "https://aiplatform.googleapis.com/v1/projects/gen-lang-client-0586185740/locations/global/endpoints/openapi",
    );
  });
});
