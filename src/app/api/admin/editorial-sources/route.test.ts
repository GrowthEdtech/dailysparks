import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { POST as login } from "../../login/route";
import {
  GET as listEditorialSources,
  POST as createEditorialSourceRoute,
  PUT as updateEditorialSourceRoute,
} from "./route";
import { SESSION_COOKIE_NAME } from "../../../../lib/session";

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

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-editorial-admin-route-"),
  );
  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_STORE_PATH: path.join(tempDirectory, "mvp-store.json"),
    DAILY_SPARKS_EDITORIAL_STORE_PATH: path.join(
      tempDirectory,
      "editorial-sources.json",
    ),
    DAILY_SPARKS_ADMIN_EMAILS: "parent@example.com",
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

async function signIn(email: string) {
  verifyIdTokenMock.mockResolvedValue({
    uid: email,
    email,
    name: "Editorial Admin",
    auth_time: Math.floor(Date.now() / 1000),
  });
  createSessionCookieMock.mockResolvedValue("firebase-session-cookie");
  verifySessionCookieMock.mockResolvedValue({
    uid: email,
    email,
    name: "Editorial Admin",
  });

  await login(
    new Request("http://localhost:3000/api/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        idToken: "firebase-id-token",
      }),
    }),
  );

  return `${SESSION_COOKIE_NAME}=firebase-session-cookie`;
}

describe("editorial admin routes", () => {
  test("rejects unauthenticated requests", async () => {
    const response = await listEditorialSources(
      new Request("http://localhost:3000/api/admin/editorial-sources"),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toMatch(/log in/i);
  });

  test("rejects authenticated non-admin users", async () => {
    const cookie = await signIn("family@example.com");
    const response = await listEditorialSources(
      new Request("http://localhost:3000/api/admin/editorial-sources", {
        headers: {
          cookie,
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.message).toMatch(/admin/i);
  });

  test("lists, creates, and updates editorial sources for admins", async () => {
    const cookie = await signIn("parent@example.com");

    const listResponse = await listEditorialSources(
      new Request("http://localhost:3000/api/admin/editorial-sources", {
        headers: {
          cookie,
        },
      }),
    );
    const listBody = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listBody.sources).toHaveLength(10);

    const createResponse = await createEditorialSourceRoute(
      new Request("http://localhost:3000/api/admin/editorial-sources", {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "The Conversation",
          domain: "theconversation.com",
          homepage: "https://theconversation.com/",
          roles: ["explainer"],
          usageTiers: ["background-context"],
          recommendedProgrammes: ["MYP", "DP"],
          sections: ["science", "education"],
          ingestionMode: "metadata-only",
          active: true,
          notes: "Academic explainers and commentary.",
        }),
      }),
    );
    const createBody = await createResponse.json();

    expect(createResponse.status).toBe(200);
    expect(createBody.source.name).toBe("The Conversation");

    const updateResponse = await updateEditorialSourceRoute(
      new Request("http://localhost:3000/api/admin/editorial-sources", {
        method: "PUT",
        headers: {
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: createBody.source.id,
          active: false,
          sections: ["science", "politics"],
          notes: "Paused after editorial review.",
        }),
      }),
    );
    const updateBody = await updateResponse.json();

    expect(updateResponse.status).toBe(200);
    expect(updateBody.source.active).toBe(false);
    expect(updateBody.source.sections).toEqual(["science", "politics"]);
  });
});
