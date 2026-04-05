import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { POST as adminLogin } from "../login/route";
import {
  EDITORIAL_ADMIN_SESSION_COOKIE_NAME,
} from "../../../../lib/editorial-admin-auth";
import { GET, POST, PUT } from "./route";

const verifyIdTokenMock = vi.fn();
const createSessionCookieMock = vi.fn();
const verifySessionCookieMock = vi.fn();

vi.mock("../../../../lib/firebase-admin", () => ({
  getFirebaseAdminAuth: () => ({
    verifyIdToken: verifyIdTokenMock,
    createSessionCookie: createSessionCookieMock,
    verifySessionCookie: verifySessionCookieMock,
  }),
}));

const ORIGINAL_ENV = { ...process.env };
let tempDirectory = "";
const validAdminSecret = "open-sesame";

beforeEach(async () => {
  tempDirectory = await mkdtemp(path.join(tmpdir(), "geo-prompts-route-"));
  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_GEO_PROMPT_STORE_PATH: path.join(tempDirectory, "geo-prompts.json"),
    DAILY_SPARKS_EDITORIAL_ADMIN_PASSWORD: validAdminSecret,
    DAILY_SPARKS_EDITORIAL_ADMIN_SESSION_SECRET:
      "test-editorial-admin-session-secret",
  };
  verifyIdTokenMock.mockReset();
  createSessionCookieMock.mockReset();
  verifySessionCookieMock.mockReset();
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

describe("geo prompts admin route", () => {
  test("rejects unauthenticated requests", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/admin/geo-prompts"),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toMatch(/log in/i);
  });

  test("lists, creates, and updates GEO prompts for admins", async () => {
    const cookie = await signIn();

    const createResponse = await POST(
      new Request("http://localhost:3000/api/admin/geo-prompts", {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          prompt: "Best LED tech for commercial lighting",
          intentLabel: "Commercial comparison",
          priority: "high",
          targetProgrammes: ["MYP", "DP"],
          engineCoverage: ["chatgpt-search", "gemini"],
          fanOutHints: ["lighting suppliers", "commercial led guide"],
          active: true,
          notes: "Track core buying intent.",
        }),
      }),
    );
    const createBody = await createResponse.json();

    expect(createResponse.status).toBe(200);
    expect(createBody.prompt.intentLabel).toBe("Commercial comparison");

    const listResponse = await GET(
      new Request("http://localhost:3000/api/admin/geo-prompts", {
        headers: {
          cookie,
        },
      }),
    );
    const listBody = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listBody.prompts).toHaveLength(1);

    const updateResponse = await PUT(
      new Request("http://localhost:3000/api/admin/geo-prompts", {
        method: "PUT",
        headers: {
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: createBody.prompt.id,
          active: false,
          notes: "Paused after weekly review.",
        }),
      }),
    );
    const updateBody = await updateResponse.json();

    expect(updateResponse.status).toBe(200);
    expect(updateBody.prompt.active).toBe(false);
  });
});
