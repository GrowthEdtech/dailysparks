import { beforeEach, describe, expect, test, vi } from "vitest";

import { POST as adminLogin } from "../../login/route";
import {
  EDITORIAL_ADMIN_SESSION_COOKIE_NAME,
} from "../../../../../lib/editorial-admin-auth";

const {
  verifyIdTokenMock,
  createSessionCookieMock,
  verifySessionCookieMock,
  runGeoMonitoringMock,
  createGeoMonitoringRunMock,
  updateGeoMonitoringRunMock,
  afterMock,
} = vi.hoisted(() => ({
  verifyIdTokenMock: vi.fn(),
  createSessionCookieMock: vi.fn(),
  verifySessionCookieMock: vi.fn(),
  runGeoMonitoringMock: vi.fn(),
  createGeoMonitoringRunMock: vi.fn(),
  updateGeoMonitoringRunMock: vi.fn(),
  afterMock: vi.fn(),
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

vi.mock("../../../../../lib/geo-monitoring-run-store", () => ({
  createGeoMonitoringRun: createGeoMonitoringRunMock,
  updateGeoMonitoringRun: updateGeoMonitoringRunMock,
}));

vi.mock("next/server", () => ({
  after: afterMock,
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
  beforeEach(() => {
    runGeoMonitoringMock.mockReset();
    createGeoMonitoringRunMock.mockReset();
    updateGeoMonitoringRunMock.mockReset();
    afterMock.mockReset();
  });

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

  test("queues async GEO monitoring for authenticated admins", async () => {
    const cookie = await signIn();
    createGeoMonitoringRunMock.mockImplementationOnce(async (input) => ({
      ...input,
      id: "run-queued-1",
      status: "running",
      queryDiagnostics: [],
    }));
    runGeoMonitoringMock.mockResolvedValueOnce({
      run: {
        id: "run-queued-1",
        status: "completed",
        createdLogCount: 1,
        machineReadabilityReadyCount: 4,
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

    expect(response.status).toBe(202);
    expect(body.mode).toBe("geo-monitoring-async");
    expect(body.run.id).toBe("run-queued-1");
    expect(body.run.status).toBe("running");
    expect(body.summary.runStatus).toBe("running");
    expect(body.summary.logCreatedCount).toBe(0);
    expect(afterMock).toHaveBeenCalledTimes(1);

    await afterMock.mock.calls[0]?.[0]();

    expect(runGeoMonitoringMock).toHaveBeenCalledWith({
      source: "manual",
      runId: "run-queued-1",
      persistMode: "update",
    });
  });
});
