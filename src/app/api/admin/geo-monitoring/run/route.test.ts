import { describe, expect, test, vi } from "vitest";

import { POST as adminLogin } from "../../login/route";
import {
  EDITORIAL_ADMIN_SESSION_COOKIE_NAME,
} from "../../../../../lib/editorial-admin-auth";

const {
  verifyIdTokenMock,
  createSessionCookieMock,
  verifySessionCookieMock,
  runGeoMonitoringMock,
} = vi.hoisted(() => ({
  verifyIdTokenMock: vi.fn(),
  createSessionCookieMock: vi.fn(),
  verifySessionCookieMock: vi.fn(),
  runGeoMonitoringMock: vi.fn(),
}));

vi.mock("../../../../../lib/firebase-admin", () => ({
  getFirebaseAdminAuth: () => ({
    verifyIdToken: verifyIdTokenMock,
    createSessionCookie: createSessionCookieMock,
    verifySessionCookie: verifySessionCookieMock,
  }),
}));

vi.mock("../../../../../lib/geo-monitoring", () => ({
  runGeoMonitoring: runGeoMonitoringMock,
}));

import { POST } from "./route";

const validAdminSecret = "open-sesame";

async function signIn() {
  process.env.DAILY_SPARKS_EDITORIAL_ADMIN_PASSWORD = validAdminSecret;
  process.env.DAILY_SPARKS_EDITORIAL_ADMIN_SESSION_SECRET =
    "test-editorial-admin-session-secret";

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

describe("admin geo monitoring route", () => {
  test("rejects unauthenticated requests", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/admin/geo-monitoring/run", {
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toMatch(/log in/i);
  });

  test("runs GEO monitoring for authenticated admins", async () => {
    const cookie = await signIn();
    runGeoMonitoringMock.mockResolvedValueOnce({
      run: {
        id: "run-1",
        status: "completed",
      },
      logs: [{ id: "log-1" }],
      machineReadabilityStatus: {
        llmsTxtStatus: "ready",
        llmsFullTxtStatus: "ready",
        ssrStatus: "ready",
        jsonLdStatus: "ready",
        notes: "",
        lastCheckedAt: "2026-04-06T08:15:00.000Z",
        updatedAt: "2026-04-06T08:15:00.000Z",
      },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/admin/geo-monitoring/run", {
        method: "POST",
        headers: {
          cookie,
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.run.id).toBe("run-1");
    expect(body.summary.logCreatedCount).toBe(1);
  });
});
