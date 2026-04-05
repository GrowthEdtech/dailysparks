import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const { deliverBriefToSingleProfileMock } = vi.hoisted(() => ({
  deliverBriefToSingleProfileMock: vi.fn(),
}));
const { revalidatePathMock } = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
}));

vi.mock("../../../../lib/daily-brief-manual-delivery", () => ({
  deliverBriefToSingleProfile: (...args: unknown[]) =>
    deliverBriefToSingleProfileMock(...args),
}));
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

import { POST as adminLogin } from "../login/route";
import { POST as dailyBriefResendRoute } from "./route";
import {
  createDailyBriefHistoryEntry,
  getDailyBriefHistoryEntry,
} from "../../../../lib/daily-brief-history-store";
import {
  EDITORIAL_ADMIN_SESSION_COOKIE_NAME,
} from "../../../../lib/editorial-admin-auth";
import {
  getOrCreateParentProfile,
  updateParentDeliveryPreferences,
  updateParentSubscription,
  updateStudentGoodnotesDelivery,
  updateStudentPreferences,
} from "../../../../lib/mvp-store";

const ORIGINAL_ENV = { ...process.env };
const validAdminSecret = "open-sesame";
let tempDirectory = "";

function buildHistoryInput(
  overrides: Partial<Parameters<typeof createDailyBriefHistoryEntry>[0]> = {},
) {
  return {
    scheduledFor: "2026-04-03",
    recordKind: "production" as const,
    headline: "Students map sea turtles",
    summary: "Families explore why migration tracking matters.",
    programme: "PYP" as const,
    editorialCohort: "APAC" as const,
    status: "published" as const,
    topicTags: ["oceans", "science"],
    sourceReferences: [
      {
        sourceId: "bbc",
        sourceName: "BBC",
        sourceDomain: "bbc.com",
        articleTitle: "Students map sea turtles",
        articleUrl: "https://www.bbc.com/news/world-123",
      },
    ],
    aiConnectionId: "nf-relay",
    aiConnectionName: "NF Relay",
    aiModel: "gpt-5.4",
    promptPolicyId: "policy-1",
    promptVersionLabel: "v1.1.1",
    promptVersion: "v1.1.1",
    repetitionRisk: "low" as const,
    repetitionNotes: "No recent overlap.",
    adminNotes: "",
    briefMarkdown: "## Today\nStudents track turtle migration.",
    pipelineStage: "published" as const,
    candidateSnapshotAt: "2026-04-03T05:00:00.000Z",
    generationCompletedAt: "2026-04-03T06:00:00.000Z",
    pdfBuiltAt: "2026-04-03T06:05:00.000Z",
    deliveryWindowAt: "2026-04-03T01:00:00.000Z",
    lastDeliveryAttemptAt: "2026-04-03T01:00:00.000Z",
    deliveryAttemptCount: 1,
    deliverySuccessCount: 0,
    deliveryFailureCount: 1,
    failedDeliveryTargets: [
      {
        parentId: "parent-1",
        parentEmail: "family@example.com",
        channel: "goodnotes" as const,
        errorMessage: "Relay timeout.",
      },
    ],
    failureReason: "One channel failed.",
    retryEligibleUntil: "2026-04-03T01:30:00.000Z",
    ...overrides,
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

async function createProfile(email: string) {
  const profile = await getOrCreateParentProfile({
    email,
    fullName: "Family Example",
    studentName: "Harper",
  });
  await updateParentSubscription(email, {
    subscriptionStatus: "active",
  });
  await updateStudentPreferences(email, {
    studentName: "Harper",
    programme: "PYP",
    programmeYear: 5,
    goodnotesEmail: "family@goodnotes.email",
  });
  await updateStudentGoodnotesDelivery(email, {
    goodnotesConnected: true,
    goodnotesVerifiedAt: "2026-04-02T00:00:00.000Z",
    goodnotesLastDeliveryStatus: "success",
    goodnotesLastDeliveryMessage: "Ready.",
  });

  return profile;
}

async function createMypProfile(email: string) {
  const profile = await getOrCreateParentProfile({
    email,
    fullName: "Family Example",
    studentName: "Harper",
    countryCode: "GB",
  });
  await updateParentSubscription(email, {
    subscriptionStatus: "active",
  });
  await updateStudentPreferences(email, {
    studentName: "Harper",
    programme: "MYP",
    programmeYear: 2,
    goodnotesEmail: "family@goodnotes.email",
  });
  await updateStudentGoodnotesDelivery(email, {
    goodnotesConnected: true,
    goodnotesVerifiedAt: "2026-04-02T00:00:00.000Z",
    goodnotesLastDeliveryStatus: "success",
    goodnotesLastDeliveryMessage: "Ready.",
  });

  await updateParentDeliveryPreferences(email, {
    countryCode: "GB",
    deliveryTimeZone: "Europe/London",
    preferredDeliveryLocalTime: "09:00",
  });

  return profile;
}

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-admin-resend-"),
  );

  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: "test",
    DAILY_SPARKS_EDITORIAL_ADMIN_PASSWORD: validAdminSecret,
    DAILY_SPARKS_EDITORIAL_ADMIN_SESSION_SECRET:
      "test-editorial-admin-session-secret",
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_STORE_PATH: path.join(tempDirectory, "mvp-store.json"),
    DAILY_SPARKS_DAILY_BRIEF_STORE_PATH: path.join(
      tempDirectory,
      "daily-brief-history.json",
    ),
  };
  deliverBriefToSingleProfileMock.mockReset();
  revalidatePathMock.mockReset();
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("admin daily brief resend route", () => {
  test("rejects unauthenticated requests", async () => {
    const response = await dailyBriefResendRoute(
      new Request("http://localhost:3000/api/admin/daily-brief-resend", {
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toMatch(/editorial admin/i);
  });

  test("resends a stored brief to one requested family and updates history", async () => {
    const cookie = await signIn();
    const profile = await createProfile("family@example.com");
    const brief = await createDailyBriefHistoryEntry(
      buildHistoryInput({
        failedDeliveryTargets: [
          {
            parentId: profile.parent.id,
            parentEmail: profile.parent.email,
            channel: "goodnotes",
            errorMessage: "Relay timeout.",
          },
        ],
      }),
    );
    deliverBriefToSingleProfileMock.mockResolvedValue({
      deliverySummary: {
        deliveryAttemptCount: 1,
        deliverySuccessCount: 1,
        deliveryFailureCount: 0,
        deliveryReceipts: [
          {
            parentId: profile.parent.id,
            parentEmail: profile.parent.email,
            channel: "goodnotes",
            renderer: "typst",
            attachmentFileName:
              "2026-04-03_DailySparks_DailyBrief_PYP_students-map-sea-turtles.pdf",
            externalId: "smtp-message-id",
            externalUrl: null,
          },
        ],
        failedDeliveryTargets: [],
      },
      updatedBrief: {
        ...(await getDailyBriefHistoryEntry(brief.id)),
        deliveryAttemptCount: 2,
        deliverySuccessCount: 1,
        deliveryFailureCount: 1,
        deliveryReceipts: [
          {
            parentId: profile.parent.id,
            parentEmail: profile.parent.email,
            channel: "goodnotes",
            renderer: "typst",
            attachmentFileName:
              "2026-04-03_DailySparks_DailyBrief_PYP_students-map-sea-turtles.pdf",
            externalId: "smtp-message-id",
            externalUrl: null,
          },
        ],
        failedDeliveryTargets: [],
        adminNotes:
          "Manual resend/backfill requested for family@example.com. Attempts: 1. Successes: 1. Failures: 0.",
      },
    });

    const response = await dailyBriefResendRoute(
      new Request("http://localhost:3000/api/admin/daily-brief-resend", {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          briefId: brief.id,
          parentEmail: "family@example.com",
          renderer: "typst",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(deliverBriefToSingleProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        brief: expect.objectContaining({ id: brief.id }),
        profile: expect.objectContaining({
          parent: expect.objectContaining({ email: "family@example.com" }),
        }),
        renderer: "typst",
        notePrefix: "Manual resend/backfill requested for family@example.com.",
      }),
    );
    expect(body.parentEmail).toBe("family@example.com");
    expect(body.deliverySummary).toMatchObject({
      deliveryAttemptCount: 1,
      deliverySuccessCount: 1,
      deliveryFailureCount: 0,
    });
    expect(body.brief?.deliverySuccessCount).toBe(1);
    expect(body.brief?.deliveryFailureCount).toBe(1);
    expect(body.brief?.deliveryReceipts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          parentEmail: "family@example.com",
          renderer: "typst",
          attachmentFileName:
            "2026-04-03_DailySparks_DailyBrief_PYP_students-map-sea-turtles.pdf",
        }),
      ]),
    );
    expect(body.brief?.failedDeliveryTargets).toEqual([]);
    expect(body.brief?.adminNotes).toMatch(/Manual resend\/backfill requested/i);
    expect(revalidatePathMock).toHaveBeenCalledTimes(4);
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/admin/editorial/daily-briefs",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(
      `/admin/editorial/daily-briefs/${brief.id}`,
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/editorial/users");
    expect(revalidatePathMock).toHaveBeenCalledWith(
      `/admin/editorial/users/${profile.parent.id}`,
    );
  });

  test("uses the auto renderer policy for PYP test-brief resend and resolves to typst", async () => {
    const cookie = await signIn();
    await createProfile("family@example.com");
    const brief = await createDailyBriefHistoryEntry(
      buildHistoryInput({
        recordKind: "test",
        status: "published",
      }),
    );

    deliverBriefToSingleProfileMock.mockResolvedValue({
      deliverySummary: {
        deliveryAttemptCount: 1,
        deliverySuccessCount: 1,
        deliveryFailureCount: 0,
        deliveryReceipts: [],
        failedDeliveryTargets: [],
      },
      updatedBrief: await getDailyBriefHistoryEntry(brief.id),
    });

    const response = await dailyBriefResendRoute(
      new Request("http://localhost:3000/api/admin/daily-brief-resend", {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          briefId: brief.id,
          parentEmail: "family@example.com",
          renderer: "auto",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(deliverBriefToSingleProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        renderer: "typst",
      }),
    );
    expect(body.rendererMode).toBe("auto");
    expect(body.renderer).toBe("typst");
    expect(body.rendererPolicyLabel).toMatch(/PYP canary/i);
  });

  test("uses the auto renderer policy for PYP production resend and resolves to typst", async () => {
    const cookie = await signIn();
    await createProfile("family@example.com");
    const brief = await createDailyBriefHistoryEntry(
      buildHistoryInput({
        recordKind: "production",
        status: "published",
      }),
    );

    deliverBriefToSingleProfileMock.mockResolvedValue({
      deliverySummary: {
        deliveryAttemptCount: 1,
        deliverySuccessCount: 1,
        deliveryFailureCount: 0,
        deliveryReceipts: [],
        failedDeliveryTargets: [],
      },
      updatedBrief: await getDailyBriefHistoryEntry(brief.id),
    });

    const response = await dailyBriefResendRoute(
      new Request("http://localhost:3000/api/admin/daily-brief-resend", {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          briefId: brief.id,
          parentEmail: "family@example.com",
          renderer: "auto",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(deliverBriefToSingleProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        renderer: "typst",
      }),
    );
    expect(body.rendererMode).toBe("auto");
    expect(body.renderer).toBe("typst");
    expect(body.rendererPolicyLabel).toMatch(/PYP production/i);
  });

  test("keeps MYP production resend on pdf-lib when auto mode is used", async () => {
    const cookie = await signIn();
    await createMypProfile("family@example.com");
    const brief = await createDailyBriefHistoryEntry(
      buildHistoryInput({
        recordKind: "production",
        programme: "MYP",
        status: "published",
        editorialCohort: "EMEA",
      }),
    );

    deliverBriefToSingleProfileMock.mockResolvedValue({
      deliverySummary: {
        deliveryAttemptCount: 1,
        deliverySuccessCount: 1,
        deliveryFailureCount: 0,
        deliveryReceipts: [],
        failedDeliveryTargets: [],
      },
      updatedBrief: await getDailyBriefHistoryEntry(brief.id),
    });

    const response = await dailyBriefResendRoute(
      new Request("http://localhost:3000/api/admin/daily-brief-resend", {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          briefId: brief.id,
          parentEmail: "family@example.com",
          renderer: "auto",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(deliverBriefToSingleProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        renderer: "pdf-lib",
      }),
    );
    expect(body.rendererMode).toBe("auto");
    expect(body.renderer).toBe("pdf-lib");
    expect(body.rendererPolicyLabel).toMatch(/MYP/i);
    expect(body.rendererPolicyLabel).toMatch(/pdf-lib/i);
  });
});
