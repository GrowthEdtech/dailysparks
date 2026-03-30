import { describe, expect, test, vi, beforeEach } from "vitest";

const verifyIdTokenMock = vi.fn();
const createSessionCookieMock = vi.fn();
const verifySessionCookieMock = vi.fn();

vi.mock("./firebase-admin", () => ({
  getFirebaseAdminAuth: () => ({
    verifyIdToken: verifyIdTokenMock,
    createSessionCookie: createSessionCookieMock,
    verifySessionCookie: verifySessionCookieMock,
  }),
}));

import {
  SESSION_COOKIE_NAME,
  createSessionFromIdToken,
  getSessionFromCookieValue,
} from "./session";

beforeEach(() => {
  verifyIdTokenMock.mockReset();
  createSessionCookieMock.mockReset();
  verifySessionCookieMock.mockReset();
});

describe("session helpers", () => {
  test("creates a session cookie header and decoded identity from a Firebase ID token", async () => {
    verifyIdTokenMock.mockResolvedValue({
      uid: "firebase-parent-1",
      email: "parent@example.com",
      name: "Parent Example",
      auth_time: Math.floor(Date.now() / 1000),
    });
    createSessionCookieMock.mockResolvedValue("firebase-session-cookie");

    const session = await createSessionFromIdToken("firebase-id-token");

    expect(session.identity.email).toBe("parent@example.com");
    expect(session.identity.name).toBe("Parent Example");
    expect(session.cookieHeader).toContain(
      `${SESSION_COOKIE_NAME}=${encodeURIComponent("firebase-session-cookie")}`,
    );
  });

  test("rejects ID tokens that do not resolve to an email address", async () => {
    verifyIdTokenMock.mockResolvedValue({
      uid: "firebase-parent-1",
      auth_time: Math.floor(Date.now() / 1000),
    });

    await expect(createSessionFromIdToken("firebase-id-token")).rejects.toThrow(
      /email/i,
    );
  });

  test("returns the decoded session identity from a verified session cookie", async () => {
    verifySessionCookieMock.mockResolvedValue({
      uid: "firebase-parent-1",
      email: "parent@example.com",
      name: "Parent Example",
    });

    const session = await getSessionFromCookieValue("firebase-session-cookie");

    expect(session?.email).toBe("parent@example.com");
    expect(session?.uid).toBe("firebase-parent-1");
  });
});
