import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { POST as adminLogin } from "../../login/route";
import {
  EDITORIAL_ADMIN_SESSION_COOKIE_NAME,
} from "../../../../../lib/editorial-admin-auth";
import { POST } from "./route";

const verifyIdTokenMock = vi.fn();
const createSessionCookieMock = vi.fn();
const verifySessionCookieMock = vi.fn();

vi.mock("../../../../../lib/firebase-admin", () => ({
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
  tempDirectory = await mkdtemp(path.join(tmpdir(), "geo-prompts-seed-route-"));
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

describe("geo prompt seed route", () => {
  test("rejects unauthenticated requests", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/admin/geo-prompts/seed", {
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toMatch(/log in/i);
  });

  test("seeds the website-derived prompts for authenticated admins", async () => {
    const cookie = await signIn();

    const response = await POST(
      new Request("http://localhost:3000/api/admin/geo-prompts/seed", {
        method: "POST",
        headers: {
          cookie,
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.createdPrompts.length).toBeGreaterThan(0);
    expect(body.totalSeedCount).toBe(body.createdPrompts.length);
  });
});
