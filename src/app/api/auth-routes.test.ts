import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { GET as getProfile, PUT as updateProfile } from "./profile/route";
import { POST as login } from "./login/route";
import { POST as logout } from "./logout/route";
import { SESSION_COOKIE_NAME } from "../../lib/session";
import * as mvpStore from "../../lib/mvp-store";

const verifyIdTokenMock = vi.fn();
const createSessionCookieMock = vi.fn();
const verifySessionCookieMock = vi.fn();

vi.mock("../../lib/firebase-admin", () => ({
  getFirebaseAdminAuth: () => ({
    verifyIdToken: verifyIdTokenMock,
    createSessionCookie: createSessionCookieMock,
    verifySessionCookie: verifySessionCookieMock,
  }),
}));

let tempDirectory = "";

beforeEach(async () => {
  tempDirectory = await mkdtemp(path.join(tmpdir(), "daily-sparks-routes-"));
  process.env.DAILY_SPARKS_STORE_PATH = path.join(tempDirectory, "mvp-store.json");
  verifyIdTokenMock.mockReset();
  createSessionCookieMock.mockReset();
  verifySessionCookieMock.mockReset();
});

afterEach(async () => {
  delete process.env.DAILY_SPARKS_STORE_PATH;

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("auth routes", () => {
  test("rejects login when the Firebase ID token is missing", async () => {
    const request = new Request("http://localhost:3000/api/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
      }),
    });

    const response = await login(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toMatch(/google|token/i);
  });

  test("creates a secure session cookie on successful Google login", async () => {
    verifyIdTokenMock.mockResolvedValue({
      uid: "firebase-parent-1",
      email: "parent@example.com",
      name: "Parent Example",
      auth_time: Math.floor(Date.now() / 1000),
    });
    createSessionCookieMock.mockResolvedValue("firebase-session-cookie");

    const request = new Request("http://localhost:3000/api/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        idToken: "firebase-id-token",
      }),
    });

    const response = await login(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.parent.email).toBe("parent@example.com");
    expect(body.student.programme).toBe("PYP");
    expect(body.student.programmeYear).toBe(5);
    expect(body.student.studentName).toBe("Student");
    expect(response.headers.get("set-cookie")).toContain(
      `${SESSION_COOKIE_NAME}=${encodeURIComponent("firebase-session-cookie")}`,
    );
  });

  test("returns a secure-session error when Firebase session creation fails", async () => {
    verifyIdTokenMock.mockResolvedValue({
      uid: "firebase-parent-1",
      email: "parent@example.com",
      name: "Parent Example",
      auth_time: Math.floor(Date.now() / 1000),
    });
    createSessionCookieMock.mockRejectedValue(new Error("session-cookie-failed"));

    const response = await login(
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

    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toMatch(/secure session/i);
  });

  test("returns a profile error when parent profile loading fails", async () => {
    verifyIdTokenMock.mockResolvedValue({
      uid: "firebase-parent-1",
      email: "parent@example.com",
      name: "Parent Example",
      auth_time: Math.floor(Date.now() / 1000),
    });
    createSessionCookieMock.mockResolvedValue("firebase-session-cookie");
    const getOrCreateParentProfileSpy = vi
      .spyOn(mvpStore, "getOrCreateParentProfile")
      .mockRejectedValueOnce(new Error("firestore-write-failed"));

    const response = await login(
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

    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.message).toMatch(/parent profile/i);

    getOrCreateParentProfileSpy.mockRestore();
  });

  test("returns the active profile for a valid session cookie", async () => {
    verifyIdTokenMock.mockResolvedValue({
      uid: "firebase-parent-1",
      email: "parent@example.com",
      name: "Parent Example",
      auth_time: Math.floor(Date.now() / 1000),
    });
    createSessionCookieMock.mockResolvedValue("firebase-session-cookie");
    verifySessionCookieMock.mockResolvedValue({
      uid: "firebase-parent-1",
      email: "parent@example.com",
      name: "Parent Example",
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

    const response = await getProfile(
      new Request("http://localhost:3000/api/profile", {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=firebase-session-cookie`,
        },
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.student.studentName).toBe("Student");
  });

  test("rejects invalid profile updates", async () => {
    verifySessionCookieMock.mockResolvedValue({
      uid: "firebase-parent-1",
      email: "parent@example.com",
      name: "Parent Example",
    });

    const response = await updateProfile(
      new Request("http://localhost:3000/api/profile", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          cookie: `${SESSION_COOKIE_NAME}=firebase-session-cookie`,
        },
        body: JSON.stringify({
          goodnotesEmail: "bad-email",
          programme: "DP",
          programmeYear: 4,
        }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toMatch(/programme|year|email/i);
  });

  test("updates the student programme, year, and child name", async () => {
    verifyIdTokenMock.mockResolvedValue({
      uid: "firebase-parent-1",
      email: "parent@example.com",
      name: "Parent Example",
      auth_time: Math.floor(Date.now() / 1000),
    });
    createSessionCookieMock.mockResolvedValue("firebase-session-cookie");
    verifySessionCookieMock.mockResolvedValue({
      uid: "firebase-parent-1",
      email: "parent@example.com",
      name: "Parent Example",
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

    const response = await updateProfile(
      new Request("http://localhost:3000/api/profile", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          cookie: `${SESSION_COOKIE_NAME}=firebase-session-cookie`,
        },
        body: JSON.stringify({
          studentName: "Katherine",
          goodnotesEmail: "katherine@goodnotes.email",
          programme: "DP",
          programmeYear: 2,
        }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.student.studentName).toBe("Katherine");
    expect(body.student.programme).toBe("DP");
    expect(body.student.programmeYear).toBe(2);
  });

  test("clears the session cookie on logout", async () => {
    const response = await logout(
      new Request("http://localhost:3000/api/logout", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(
      `${SESSION_COOKIE_NAME}=;`,
    );
  });
});
