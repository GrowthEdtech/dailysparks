import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  EDITORIAL_ADMIN_SESSION_COOKIE_NAME,
  clearEditorialAdminSessionCookieHeader,
  createEditorialAdminSession,
  getEditorialAdminSessionFromCookieValue,
  isEditorialAdminAuthConfigured,
  verifyEditorialAdminPassword,
} from "./editorial-admin-auth";

const ORIGINAL_ENV = { ...process.env };

function getCookieValueFromHeader(setCookieHeader: string) {
  const match = setCookieHeader.match(
    new RegExp(`${EDITORIAL_ADMIN_SESSION_COOKIE_NAME}=([^;]+)`),
  );

  return match ? decodeURIComponent(match[1]) : null;
}

beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_EDITORIAL_ADMIN_PASSWORD: "open-sesame",
    DAILY_SPARKS_EDITORIAL_ADMIN_SESSION_SECRET:
      "test-editorial-admin-session-secret",
  };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("editorial admin auth", () => {
  test("reports whether password-login auth is configured", () => {
    expect(isEditorialAdminAuthConfigured()).toBe(true);

    delete process.env.DAILY_SPARKS_EDITORIAL_ADMIN_PASSWORD;

    expect(isEditorialAdminAuthConfigured()).toBe(false);
  });

  test("matches the configured admin password without trimming away mistakes", () => {
    expect(verifyEditorialAdminPassword("open-sesame")).toBe(true);
    expect(verifyEditorialAdminPassword("open-sesame ")).toBe(false);
    expect(verifyEditorialAdminPassword("wrong-password")).toBe(false);
  });

  test("creates and verifies a signed admin session cookie", async () => {
    const session = createEditorialAdminSession();
    const cookieValue = getCookieValueFromHeader(session.cookieHeader);

    expect(session.cookieHeader).toContain(
      `${EDITORIAL_ADMIN_SESSION_COOKIE_NAME}=`,
    );
    expect(cookieValue).toBeTruthy();

    const verifiedSession = await getEditorialAdminSessionFromCookieValue(
      cookieValue,
    );

    expect(verifiedSession?.role).toBe("editorial-admin");
    expect(verifiedSession?.expiresAt).toBeGreaterThan(verifiedSession?.issuedAt ?? 0);
  });

  test("clears the admin cookie on logout", () => {
    expect(clearEditorialAdminSessionCookieHeader()).toContain(
      `${EDITORIAL_ADMIN_SESSION_COOKIE_NAME}=;`,
    );
  });
});
