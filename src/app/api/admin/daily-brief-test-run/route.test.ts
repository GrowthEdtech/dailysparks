import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const {
  ingestRouteMock,
  generateRouteMock,
  preflightRouteMock,
  deliverRouteMock,
  getProfileByEmailMock,
  listDailyBriefHistoryMock,
  deliverBriefToSingleProfileMock,
} = vi.hoisted(() => ({
  ingestRouteMock: vi.fn(),
  generateRouteMock: vi.fn(),
  preflightRouteMock: vi.fn(),
  deliverRouteMock: vi.fn(),
  getProfileByEmailMock: vi.fn(),
  listDailyBriefHistoryMock: vi.fn(),
  deliverBriefToSingleProfileMock: vi.fn(),
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

vi.mock("../../../../lib/daily-brief-history-store", async () => {
  const actual = await vi.importActual<
    typeof import("../../../../lib/daily-brief-history-store")
  >("../../../../lib/daily-brief-history-store");

  return {
    ...actual,
    listDailyBriefHistory: (...args: unknown[]) =>
      listDailyBriefHistoryMock(...args),
  };
});

vi.mock("../../../../lib/daily-brief-manual-delivery", () => ({
  deliverBriefToSingleProfile: (...args: unknown[]) =>
    deliverBriefToSingleProfileMock(...args),
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
  listDailyBriefHistoryMock.mockReset();
  deliverBriefToSingleProfileMock.mockReset();
  listDailyBriefHistoryMock.mockResolvedValue([]);
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
          renderer: "typst",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.runDate).toBe("2026-04-04");
    expect(body.targetParentEmails).toEqual(["family@example.com"]);
    expect(body.renderer).toBe("typst");
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
      renderer: "typst",
    });
  });

  test("uses the auto renderer policy for PYP staged tests and resolves to typst", async () => {
    const cookie = await signIn();
    const pypProfile = createProfile({
      parent: {
        email: "family@example.com",
        countryCode: "HK",
        deliveryTimeZone: "Asia/Hong_Kong",
        preferredDeliveryLocalTime: "09:00",
      },
      student: {
        parentId: "parent-1",
        programme: "PYP",
      },
    });
    let deliverRequestBody: Record<string, unknown> | null = null;

    getProfileByEmailMock.mockResolvedValue(pypProfile);
    ingestRouteMock.mockResolvedValue(
      Response.json({ mode: "ingest", summary: { candidateCount: 2 } }),
    );
    generateRouteMock.mockResolvedValue(
      Response.json({ mode: "generate", summary: { generatedCount: 1 } }),
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
          parentEmail: "family@example.com",
          renderer: "auto",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.rendererMode).toBe("auto");
    expect(body.renderer).toBe("typst");
    expect(body.rendererPolicyLabel).toMatch(/PYP canary/i);
    expect(deliverRequestBody).toMatchObject({
      renderer: "typst",
    });
  });

  test("uses the auto renderer policy for MYP staged tests and resolves to typst", async () => {
    const cookie = await signIn();
    let deliverRequestBody: Record<string, unknown> | null = null;

    getProfileByEmailMock.mockResolvedValue(
      createProfile({
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
      }),
    );
    ingestRouteMock.mockResolvedValue(
      Response.json({ mode: "ingest", summary: { candidateCount: 2 } }),
    );
    generateRouteMock.mockResolvedValue(
      Response.json({ mode: "generate", summary: { generatedCount: 1 } }),
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
          parentEmail: "family@example.com",
          renderer: "auto",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.rendererMode).toBe("auto");
    expect(body.renderer).toBe("typst");
    expect(body.rendererPolicyLabel).toMatch(/Typst live/i);
    expect(deliverRequestBody).toMatchObject({
      renderer: "typst",
    });
  });

  test("uses the auto renderer policy for DP staged tests and resolves to typst", async () => {
    const cookie = await signIn();
    let deliverRequestBody: Record<string, unknown> | null = null;

    getProfileByEmailMock.mockResolvedValue(
      createProfile({
        parent: {
          email: "family@example.com",
          countryCode: "US",
          deliveryTimeZone: "America/New_York",
          preferredDeliveryLocalTime: "09:00",
        },
        student: {
          parentId: "parent-1",
          programme: "DP",
          programmeYear: 1,
        },
      }),
    );
    ingestRouteMock.mockResolvedValue(
      Response.json({ mode: "ingest", summary: { candidateCount: 2 } }),
    );
    generateRouteMock.mockResolvedValue(
      Response.json({ mode: "generate", summary: { generatedCount: 1 } }),
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
          parentEmail: "family@example.com",
          renderer: "auto",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.rendererMode).toBe("auto");
    expect(body.renderer).toBe("typst");
    expect(body.rendererPolicyLabel).toMatch(/Typst live/i);
    expect(deliverRequestBody).toMatchObject({
      renderer: "typst",
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

  test("reuses an existing same-day test brief for the target programme when delivery selected nobody", async () => {
    const cookie = await signIn();
    const targetProfile = createProfile({
      parent: {
        id: "parent-ckx",
        email: "ckx.leung@gmail.com",
        countryCode: "HK",
        deliveryTimeZone: "Asia/Hong_Kong",
        preferredDeliveryLocalTime: "09:00",
      },
      student: {
        parentId: "parent-ckx",
        studentName: "Charles",
        programme: "PYP",
      },
    });

    getProfileByEmailMock.mockResolvedValue(targetProfile);
    listDailyBriefHistoryMock.mockResolvedValue([
      {
        id: "brief-pyp-existing",
        scheduledFor: "2026-04-05",
        recordKind: "test",
        headline: "UN watchdog voices 'deep concern' as Iran reports new attacks on nuclear plant",
        normalizedHeadline:
          "un watchdog voices deep concern as iran reports new attacks on nuclear plant",
        summary: "Families review why the IAEA is worried about reported attacks near a nuclear plant.",
        programme: "PYP",
        editorialCohort: "APAC",
        status: "published",
        topicClusterKey:
          "un watchdog voices 'deep concern' as iran reports new attacks on nuclear plant",
        topicLatestPublishedAt: null,
        selectionDecision: "new",
        selectionOverrideNote: "",
        blockedTopics: [],
        topicTags: ["nuclear safety"],
        sourceReferences: [
          {
            sourceId: "bbc",
            sourceName: "BBC",
            sourceDomain: "bbc.com",
            articleTitle:
              "UN watchdog voices 'deep concern' as Iran reports new attacks on nuclear plant",
            articleUrl: "https://www.bbc.com/news/articles/test",
          },
        ],
        aiConnectionId: "nf-relay",
        aiConnectionName: "NF Relay",
        aiModel: "gpt-5.4",
        promptPolicyId: "policy-1",
        promptVersionLabel: "v1.1.1",
        promptVersion: "v1.1.1",
        repetitionRisk: "low",
        repetitionNotes: "No recent overlap.",
        adminNotes: "",
        briefMarkdown: "## Today\nA published PYP test brief already exists.",
        pipelineStage: "published",
        candidateSnapshotAt: "2026-04-05T00:30:00.000Z",
        generationCompletedAt: "2026-04-05T00:35:00.000Z",
        pdfBuiltAt: "2026-04-05T00:40:00.000Z",
        deliveryWindowAt: "2026-04-05T01:00:00.000Z",
        lastDeliveryAttemptAt: "2026-04-05T01:00:00.000Z",
        deliveryAttemptCount: 1,
        deliverySuccessCount: 1,
        deliveryFailureCount: 0,
        dispatchMode: "canary",
        dispatchCanaryParentEmails: ["admin@geledtech.com"],
        targetedProfiles: [],
        skippedProfiles: [],
        pendingFutureProfiles: [],
        heldProfiles: [],
        deliveryReceipts: [
          {
            parentId: "parent-admin",
            parentEmail: "admin@geledtech.com",
            channel: "goodnotes",
            renderer: "typst",
            attachmentFileName:
              "2026-04-05_DailySparks_DailyBrief_PYP_un-watchdog-voices-deep-concern-as-iran-reports_test.pdf",
            externalId: "admin-delivery-id",
            externalUrl: null,
          },
        ],
        failedDeliveryTargets: [],
        failureReason: "",
        retryEligibleUntil: "2026-04-05T01:30:00.000Z",
        createdAt: "2026-04-05T00:35:00.000Z",
        updatedAt: "2026-04-05T01:05:00.000Z",
      },
    ]);
    ingestRouteMock.mockResolvedValue(
      Response.json({
        mode: "ingest",
        summary: { candidateCount: 3 },
      }),
    );
    generateRouteMock.mockResolvedValue(
      Response.json({
        mode: "generate",
        summary: {
          generatedCount: 2,
          skippedProgrammes: ["PYP"],
        },
      }),
    );
    preflightRouteMock.mockResolvedValue(
      Response.json({
        mode: "preflight",
        ready: true,
        summary: { approvedCount: 2 },
      }),
    );
    deliverRouteMock.mockResolvedValue(
      Response.json({
        mode: "deliver",
        summary: {
          dispatchMode: "canary",
          targetedProfileCount: 0,
          deliverableCount: 2,
          deliveredCount: 0,
          failedCount: 2,
        },
      }),
    );
    deliverBriefToSingleProfileMock.mockResolvedValue({
      deliverySummary: {
        deliveryAttemptCount: 1,
        deliverySuccessCount: 1,
        deliveryFailureCount: 0,
        deliveryReceipts: [
          {
            parentId: "parent-ckx",
            parentEmail: "ckx.leung@gmail.com",
            channel: "goodnotes",
            renderer: "typst",
            attachmentFileName:
              "2026-04-05_DailySparks_DailyBrief_PYP_un-watchdog-voices-deep-concern-as-iran-reports_test.pdf",
            externalId: "ckx-delivery-id",
            externalUrl: null,
          },
        ],
        failedDeliveryTargets: [],
      },
      updatedBrief: null,
    });

    const response = await dailyBriefTestRunRoute(
      new Request("http://localhost:3000/api/admin/daily-brief-test-run", {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          runDate: "2026-04-05",
          parentEmail: "ckx.leung@gmail.com",
          renderer: "auto",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(deliverBriefToSingleProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        brief: expect.objectContaining({
          id: "brief-pyp-existing",
          programme: "PYP",
          editorialCohort: "APAC",
        }),
        profile: expect.objectContaining({
          parent: expect.objectContaining({
            email: "ckx.leung@gmail.com",
          }),
        }),
        renderer: "typst",
        notePrefix: expect.stringMatching(/manual staged test/i),
      }),
    );
    expect(body.stages.deliver.body.manualBackfill).toMatchObject({
      briefId: "brief-pyp-existing",
      parentEmail: "ckx.leung@gmail.com",
      deliverySuccessCount: 1,
      deliveryFailureCount: 0,
    });
  });

  test("re-sends an existing same-day test brief even when that family already has an older receipt", async () => {
    const cookie = await signIn();
    const targetProfile = createProfile({
      parent: {
        id: "parent-ckx",
        email: "ckx.leung@gmail.com",
        countryCode: "HK",
        deliveryTimeZone: "Asia/Hong_Kong",
        preferredDeliveryLocalTime: "09:00",
      },
      student: {
        parentId: "parent-ckx",
        studentName: "Charles",
        programme: "PYP",
      },
    });

    getProfileByEmailMock.mockResolvedValue(targetProfile);
    listDailyBriefHistoryMock.mockResolvedValue([
      {
        id: "brief-pyp-existing",
        scheduledFor: "2026-04-05",
        recordKind: "test",
        headline: "UN watchdog voices 'deep concern' as Iran reports new attacks on nuclear plant",
        normalizedHeadline:
          "un watchdog voices deep concern as iran reports new attacks on nuclear plant",
        summary: "Families review why the IAEA is worried about reported attacks near a nuclear plant.",
        programme: "PYP",
        editorialCohort: "APAC",
        status: "published",
        topicClusterKey:
          "un watchdog voices 'deep concern' as iran reports new attacks on nuclear plant",
        topicLatestPublishedAt: null,
        selectionDecision: "new",
        selectionOverrideNote: "",
        blockedTopics: [],
        topicTags: ["nuclear safety"],
        sourceReferences: [
          {
            sourceId: "bbc",
            sourceName: "BBC",
            sourceDomain: "bbc.com",
            articleTitle:
              "UN watchdog voices 'deep concern' as Iran reports new attacks on nuclear plant",
            articleUrl: "https://www.bbc.com/news/articles/test",
          },
        ],
        aiConnectionId: "nf-relay",
        aiConnectionName: "NF Relay",
        aiModel: "gpt-5.4",
        promptPolicyId: "policy-1",
        promptVersionLabel: "v1.1.1",
        promptVersion: "v1.1.1",
        repetitionRisk: "low",
        repetitionNotes: "No recent overlap.",
        adminNotes: "",
        briefMarkdown: "## Today\nA published PYP test brief already exists.",
        pipelineStage: "published",
        candidateSnapshotAt: "2026-04-05T00:30:00.000Z",
        generationCompletedAt: "2026-04-05T00:35:00.000Z",
        pdfBuiltAt: "2026-04-05T00:40:00.000Z",
        deliveryWindowAt: "2026-04-05T01:00:00.000Z",
        lastDeliveryAttemptAt: "2026-04-05T01:00:00.000Z",
        deliveryAttemptCount: 1,
        deliverySuccessCount: 1,
        deliveryFailureCount: 0,
        dispatchMode: "canary",
        dispatchCanaryParentEmails: ["ckx.leung@gmail.com"],
        targetedProfiles: [],
        skippedProfiles: [],
        pendingFutureProfiles: [],
        heldProfiles: [],
        deliveryReceipts: [
          {
            parentId: "parent-ckx",
            parentEmail: "ckx.leung@gmail.com",
            channel: "goodnotes",
            renderer: "typst",
            attachmentFileName:
              "2026-04-05_DailySparks_DailyBrief_PYP_un-watchdog-voices-deep-concern-as-iran-reports_canary.pdf",
            externalId: "prior-delivery-id",
            externalUrl: null,
          },
        ],
        failedDeliveryTargets: [],
        failureReason: "",
        retryEligibleUntil: "2026-04-05T01:30:00.000Z",
        createdAt: "2026-04-05T00:35:00.000Z",
        updatedAt: "2026-04-05T01:05:00.000Z",
      },
    ]);
    ingestRouteMock.mockResolvedValue(
      Response.json({
        mode: "ingest",
        summary: { candidateCount: 3 },
      }),
    );
    generateRouteMock.mockResolvedValue(
      Response.json({
        mode: "generate",
        summary: {
          generatedCount: 2,
          skippedProgrammes: ["PYP"],
        },
      }),
    );
    preflightRouteMock.mockResolvedValue(
      Response.json({
        mode: "preflight",
        ready: true,
        summary: { approvedCount: 2 },
      }),
    );
    deliverRouteMock.mockResolvedValue(
      Response.json({
        mode: "deliver",
        summary: {
          dispatchMode: "canary",
          targetedProfileCount: 0,
          deliverableCount: 2,
          deliveredCount: 0,
          failedCount: 2,
        },
      }),
    );
    deliverBriefToSingleProfileMock.mockResolvedValue({
      deliverySummary: {
        deliveryAttemptCount: 1,
        deliverySuccessCount: 1,
        deliveryFailureCount: 0,
        deliveryReceipts: [
          {
            parentId: "parent-ckx",
            parentEmail: "ckx.leung@gmail.com",
            channel: "goodnotes",
            renderer: "typst",
            attachmentFileName:
              "2026-04-05_DailySparks_DailyBrief_PYP_un-watchdog-voices-deep-concern-as-iran-reports_canary.pdf",
            externalId: "fresh-delivery-id",
            externalUrl: null,
          },
        ],
        failedDeliveryTargets: [],
      },
      updatedBrief: null,
    });

    const response = await dailyBriefTestRunRoute(
      new Request("http://localhost:3000/api/admin/daily-brief-test-run", {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          runDate: "2026-04-05",
          parentEmail: "ckx.leung@gmail.com",
          renderer: "auto",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(deliverBriefToSingleProfileMock).toHaveBeenCalledOnce();
  });

  test("does not fallback-send a same-day brief that never passed preflight", async () => {
    const cookie = await signIn();
    const targetProfile = createProfile({
      parent: {
        id: "parent-ckx",
        email: "ckx.leung@gmail.com",
        countryCode: "HK",
        deliveryTimeZone: "Asia/Hong_Kong",
        preferredDeliveryLocalTime: "09:00",
      },
      student: {
        parentId: "parent-ckx",
        studentName: "Charles",
        programme: "PYP",
      },
    });

    getProfileByEmailMock.mockResolvedValue(targetProfile);
    listDailyBriefHistoryMock.mockResolvedValue([
      {
        id: "brief-pyp-draft-only",
        scheduledFor: "2026-04-05",
        recordKind: "test",
        headline: "Draft PYP test brief",
        normalizedHeadline: "draft pyp test brief",
        summary: "A draft record exists but never passed preflight.",
        programme: "PYP",
        editorialCohort: "APAC",
        status: "draft",
        topicClusterKey: "draft pyp test brief",
        topicLatestPublishedAt: null,
        selectionDecision: "new",
        selectionOverrideNote: "",
        blockedTopics: [],
        topicTags: ["science"],
        sourceReferences: [
          {
            sourceId: "bbc",
            sourceName: "BBC",
            sourceDomain: "bbc.com",
            articleTitle: "Draft PYP test brief",
            articleUrl: "https://www.bbc.com/news/articles/test",
          },
        ],
        aiConnectionId: "nf-relay",
        aiConnectionName: "NF Relay",
        aiModel: "gpt-5.4",
        promptPolicyId: "policy-1",
        promptVersionLabel: "v1.1.1",
        promptVersion: "v1.1.1",
        repetitionRisk: "low",
        repetitionNotes: "No recent overlap.",
        adminNotes: "",
        briefMarkdown: "## Draft\nNot approved yet.",
        pipelineStage: "generated",
        candidateSnapshotAt: "2026-04-05T00:30:00.000Z",
        generationCompletedAt: "2026-04-05T00:35:00.000Z",
        pdfBuiltAt: null,
        deliveryWindowAt: "2026-04-05T01:00:00.000Z",
        lastDeliveryAttemptAt: null,
        deliveryAttemptCount: 0,
        deliverySuccessCount: 0,
        deliveryFailureCount: 0,
        dispatchMode: null,
        dispatchCanaryParentEmails: [],
        targetedProfiles: [],
        skippedProfiles: [],
        pendingFutureProfiles: [],
        heldProfiles: [],
        deliveryReceipts: [],
        failedDeliveryTargets: [],
        failureReason: "",
        retryEligibleUntil: null,
        createdAt: "2026-04-05T00:35:00.000Z",
        updatedAt: "2026-04-05T00:35:00.000Z",
      },
    ]);
    ingestRouteMock.mockResolvedValue(
      Response.json({
        mode: "ingest",
        summary: { candidateCount: 3 },
      }),
    );
    generateRouteMock.mockResolvedValue(
      Response.json({
        mode: "generate",
        summary: {
          generatedCount: 2,
          skippedProgrammes: ["PYP"],
        },
      }),
    );
    preflightRouteMock.mockResolvedValue(
      Response.json({
        mode: "preflight",
        ready: true,
        summary: { approvedCount: 2 },
      }),
    );
    deliverRouteMock.mockResolvedValue(
      Response.json({
        mode: "deliver",
        summary: {
          dispatchMode: "canary",
          targetedProfileCount: 0,
          deliverableCount: 2,
          deliveredCount: 0,
          failedCount: 2,
        },
      }),
    );

    const response = await dailyBriefTestRunRoute(
      new Request("http://localhost:3000/api/admin/daily-brief-test-run", {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          runDate: "2026-04-05",
          parentEmail: "ckx.leung@gmail.com",
          renderer: "auto",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(deliverBriefToSingleProfileMock).not.toHaveBeenCalled();
    expect(body.stages.deliver.body.manualBackfill).toMatchObject({
      parentEmail: "ckx.leung@gmail.com",
      skippedReason:
        "No approved or published same-day test brief was available for fallback delivery.",
    });
  });
});
