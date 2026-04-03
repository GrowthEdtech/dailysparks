import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const {
  ingestRouteMock,
  generateRouteMock,
  preflightRouteMock,
  deliverRouteMock,
} = vi.hoisted(() => ({
  ingestRouteMock: vi.fn(),
  generateRouteMock: vi.fn(),
  preflightRouteMock: vi.fn(),
  deliverRouteMock: vi.fn(),
}));

vi.mock("../../internal/daily-brief/ingest/route", () => ({
  POST: (...args: unknown[]) => ingestRouteMock(...args),
}));

vi.mock("../../internal/daily-brief/generate/route", () => ({
  POST: (...args: unknown[]) => generateRouteMock(...args),
}));

vi.mock("../../internal/daily-brief/preflight/route", () => ({
  POST: (...args: unknown[]) => preflightRouteMock(...args),
}));

vi.mock("../../internal/daily-brief/deliver/route", () => ({
  POST: (...args: unknown[]) => deliverRouteMock(...args),
}));

import { POST as adminLogin } from "../login/route";
import { POST as dailyBriefTestRunRoute } from "./route";
import { EDITORIAL_ADMIN_SESSION_COOKIE_NAME } from "../../../../lib/editorial-admin-auth";

const ORIGINAL_ENV = { ...process.env };

const validAdminSecret = "open-sesame";
const schedulerSecret = "scheduler-secret";

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

beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_EDITORIAL_ADMIN_PASSWORD: validAdminSecret,
    DAILY_SPARKS_EDITORIAL_ADMIN_SESSION_SECRET:
      "test-editorial-admin-session-secret",
    DAILY_SPARKS_SCHEDULER_SECRET: schedulerSecret,
  };
  ingestRouteMock.mockReset();
  generateRouteMock.mockReset();
  preflightRouteMock.mockReset();
  deliverRouteMock.mockReset();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("daily brief test run admin route", () => {
  test("rejects unauthenticated requests", async () => {
    const response = await dailyBriefTestRunRoute(
      new Request("http://localhost:3000/api/admin/daily-brief-test-run", {
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toMatch(/editorial admin/i);
  });

  test("runs the staged pipeline and forces delivery to admin@geledtech.com only", async () => {
    const cookie = await signIn();
    let deliverRequestBody: Record<string, unknown> | null = null;

    ingestRouteMock.mockResolvedValue(
      Response.json({
        mode: "ingest",
        summary: { candidateCount: 3 },
      }),
    );
    generateRouteMock.mockResolvedValue(
      Response.json({
        mode: "generate",
        summary: { generatedCount: 1 },
      }),
    );
    preflightRouteMock.mockResolvedValue(
      Response.json({
        mode: "preflight",
        ready: true,
        summary: { approvedCount: 1 },
      }),
    );
    deliverRouteMock.mockImplementation(async (request: Request) => {
      deliverRequestBody = (await request.json()) as Record<string, unknown>;

      return Response.json({
        mode: "deliver",
        summary: {
          deliveredCount: 1,
          dispatchMode: "canary",
          targetedProfileCount: 1,
          skippedProfileCount: 0,
        },
      });
    });

    const response = await dailyBriefTestRunRoute(
      new Request("http://localhost:3000/api/admin/daily-brief-test-run", {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          runDate: "2026-04-04",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.runDate).toBe("2026-04-04");
    expect(body.targetParentEmails).toEqual(["admin@geledtech.com"]);
    expect(ingestRouteMock).toHaveBeenCalledTimes(1);
    expect(generateRouteMock).toHaveBeenCalledTimes(1);
    expect(preflightRouteMock).toHaveBeenCalledTimes(1);
    expect(deliverRouteMock).toHaveBeenCalledTimes(1);
    expect(deliverRequestBody).toEqual({
      runDate: "2026-04-04",
      dispatchMode: "canary",
      canaryParentEmails: ["admin@geledtech.com"],
    });
  });
});
