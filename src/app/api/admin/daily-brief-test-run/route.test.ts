import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const {
  ingestRouteMock,
  generateRouteMock,
  preflightRouteMock,
  deliverRouteMock,
  getProfileByEmailMock,
} = vi.hoisted(() => ({
  ingestRouteMock: vi.fn(),
  generateRouteMock: vi.fn(),
  preflightRouteMock: vi.fn(),
  deliverRouteMock: vi.fn(),
  getProfileByEmailMock: vi.fn(),
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

vi.mock("../../../../lib/mvp-store", () => ({
  getProfileByEmail: (...args: unknown[]) => getProfileByEmailMock(...args),
}));

import { POST as adminLogin } from "../login/route";
import { POST as dailyBriefTestRunRoute } from "./route";
import { EDITORIAL_ADMIN_SESSION_COOKIE_NAME } from "../../../../lib/editorial-admin-auth";
import type { ParentProfile } from "../../../../lib/mvp-types";

const ORIGINAL_ENV = { ...process.env };

const validAdminSecret = "open-sesame";
const schedulerSecret = "scheduler-secret";

function createProfile(
  overrides?: Partial<ParentProfile>,
): ParentProfile {
  return {
    parent: {
      id: "parent-1",
      email: "admin@geledtech.com",
      fullName: "Admin Parent",
      subscriptionStatus: "active",
      subscriptionPlan: "monthly",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      trialStartedAt: "2026-04-01T00:00:00.000Z",
      trialEndsAt: "2026-04-08T00:00:00.000Z",
      subscriptionActivatedAt: "2026-04-01T00:00:00.000Z",
      subscriptionRenewalAt: "2026-05-01T00:00:00.000Z",
      latestInvoiceId: null,
      latestInvoiceNumber: null,
      latestInvoiceStatus: null,
      latestInvoiceHostedUrl: null,
      latestInvoicePdfUrl: null,
      latestInvoiceAmountPaid: null,
      latestInvoiceCurrency: null,
      latestInvoicePaidAt: null,
      latestInvoicePeriodStart: null,
      latestInvoicePeriodEnd: null,
      notionWorkspaceId: null,
      notionWorkspaceName: null,
      notionBotId: null,
      notionDatabaseId: null,
      notionDatabaseName: null,
      notionDataSourceId: null,
      notionAuthorizedAt: null,
      notionLastSyncedAt: null,
      notionLastSyncStatus: null,
      notionLastSyncMessage: null,
      notionLastSyncPageId: null,
      notionLastSyncPageUrl: null,
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
      ...overrides?.parent,
    },
    student: {
      id: "student-1",
      parentId: "parent-1",
      studentName: "Katherine",
      programme: "MYP",
      programmeYear: 2,
      goodnotesEmail: "me.fvdhgzd@goodnotes.email",
      goodnotesConnected: true,
      goodnotesVerifiedAt: "2026-04-03T03:20:00.000Z",
      goodnotesLastTestSentAt: null,
      goodnotesLastDeliveryStatus: "success",
      goodnotesLastDeliveryMessage: "Ready.",
      notionConnected: false,
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
      ...overrides?.student,
    },
  };
}

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
  getProfileByEmailMock.mockReset();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.useRealTimers();
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

  test("runs the staged pipeline and forces delivery to the requested family only", async () => {
    const cookie = await signIn();
    const customProfile = createProfile({
      parent: {
        email: "family@example.com",
        countryCode: "GB",
        deliveryTimeZone: "Europe/London",
        preferredDeliveryLocalTime: "09:00",
      },
      student: {
        parentId: "parent-1",
        programme: "MYP",
      },
    });
    let ingestRequestBody: Record<string, unknown> | null = null;
    let generateRequestBody: Record<string, unknown> | null = null;
    let preflightRequestBody: Record<string, unknown> | null = null;
    let deliverRequestBody: Record<string, unknown> | null = null;

    getProfileByEmailMock.mockResolvedValue(customProfile);

    ingestRouteMock.mockImplementation(async (request: Request) => {
      ingestRequestBody = (await request.json()) as Record<string, unknown>;

      return Response.json({
        mode: "ingest",
        summary: { candidateCount: 3 },
      });
    });
    generateRouteMock.mockImplementation(async (request: Request) => {
      generateRequestBody = (await request.json()) as Record<string, unknown>;

      return Response.json({
        mode: "generate",
        summary: { generatedCount: 1 },
      });
    });
    preflightRouteMock.mockImplementation(async (request: Request) => {
      preflightRequestBody = (await request.json()) as Record<string, unknown>;

      return Response.json({
        mode: "preflight",
        ready: true,
        summary: { approvedCount: 1 },
      });
    });
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
          parentEmail: "family@example.com",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.runDate).toBe("2026-04-04");
    expect(body.targetParentEmails).toEqual(["family@example.com"]);
    expect(getProfileByEmailMock).toHaveBeenCalledWith("family@example.com");
    expect(ingestRouteMock).toHaveBeenCalledTimes(1);
    expect(generateRouteMock).toHaveBeenCalledTimes(1);
    expect(preflightRouteMock).toHaveBeenCalledTimes(1);
    expect(deliverRouteMock).toHaveBeenCalledTimes(1);
    expect(ingestRequestBody).toEqual({
      runDate: "2026-04-04",
      recordKind: "test",
    });
    expect(generateRequestBody).toEqual({
      runDate: "2026-04-04",
      recordKind: "test",
      editorialCohort: "EMEA",
    });
    expect(preflightRequestBody).toEqual({
      runDate: "2026-04-04",
      recordKind: "test",
      editorialCohort: "EMEA",
    });
    expect(deliverRequestBody).toEqual({
      runDate: "2026-04-04",
      recordKind: "test",
      dispatchMode: "canary",
      canaryParentEmails: ["family@example.com"],
      forceDispatch: true,
    });
  });

  test("defaults to the next Hong Kong business date when runDate is omitted", async () => {
    const cookie = await signIn();
    let ingestRequestBody: Record<string, unknown> | null = null;

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-03T16:30:00.000Z"));
    getProfileByEmailMock.mockResolvedValue(createProfile());

    ingestRouteMock.mockImplementation(async (request: Request) => {
      ingestRequestBody = (await request.json()) as Record<string, unknown>;

      return Response.json({
        mode: "ingest",
        summary: { candidateCount: 2 },
      });
    });
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
    deliverRouteMock.mockResolvedValue(
      Response.json({
        mode: "deliver",
        summary: { deliveredCount: 1 },
      }),
    );

    const response = await dailyBriefTestRunRoute(
      new Request("http://localhost:3000/api/admin/daily-brief-test-run", {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.runDate).toBe("2026-04-05");
    expect(ingestRequestBody).toMatchObject({
      runDate: "2026-04-05",
      recordKind: "test",
    });
  });

  test("rejects a custom recipient when no family profile exists", async () => {
    const cookie = await signIn();

    getProfileByEmailMock.mockResolvedValue(null);

    const response = await dailyBriefTestRunRoute(
      new Request("http://localhost:3000/api/admin/daily-brief-test-run", {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          runDate: "2026-04-04",
          parentEmail: "missing@example.com",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.message).toMatch(/family profile/i);
  });
});
