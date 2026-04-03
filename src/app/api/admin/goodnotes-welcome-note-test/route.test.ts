import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const {
  getProfileByEmailMock,
  updateStudentGoodnotesDeliveryMock,
  sendTestBriefToGoodnotesMock,
} = vi.hoisted(() => ({
  getProfileByEmailMock: vi.fn(),
  updateStudentGoodnotesDeliveryMock: vi.fn(),
  sendTestBriefToGoodnotesMock: vi.fn(),
}));

vi.mock("../../../../lib/mvp-store", () => ({
  getProfileByEmail: (...args: unknown[]) => getProfileByEmailMock(...args),
  updateStudentGoodnotesDelivery: (...args: unknown[]) =>
    updateStudentGoodnotesDeliveryMock(...args),
}));

vi.mock("../../../../lib/goodnotes-delivery", () => ({
  sendTestBriefToGoodnotes: (...args: unknown[]) =>
    sendTestBriefToGoodnotesMock(...args),
}));

import { POST as adminLogin } from "../login/route";
import { POST as goodnotesWelcomeNoteTestRoute } from "./route";
import { EDITORIAL_ADMIN_SESSION_COOKIE_NAME } from "../../../../lib/editorial-admin-auth";
import type { ParentProfile } from "../../../../lib/mvp-types";

const ORIGINAL_ENV = { ...process.env };
const validAdminSecret = "open-sesame";

function createProfile(overrides?: Partial<ParentProfile>): ParentProfile {
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
      goodnotesConnected: false,
      goodnotesVerifiedAt: null,
      goodnotesLastTestSentAt: null,
      goodnotesLastDeliveryStatus: "idle",
      goodnotesLastDeliveryMessage:
        "Goodnotes destination saved. Send a welcome note to confirm this destination.",
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
  };
  getProfileByEmailMock.mockReset();
  updateStudentGoodnotesDeliveryMock.mockReset();
  sendTestBriefToGoodnotesMock.mockReset();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("admin goodnotes welcome note test route", () => {
  test("rejects unauthenticated requests", async () => {
    const response = await goodnotesWelcomeNoteTestRoute(
      new Request("http://localhost:3000/api/admin/goodnotes-welcome-note-test", {
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toMatch(/editorial admin/i);
  });

  test("sends a welcome note to the requested parent email", async () => {
    const cookie = await signIn();
    const existingProfile = createProfile();
    const updatedProfile = createProfile({
      student: {
        ...existingProfile.student,
        goodnotesConnected: true,
        goodnotesVerifiedAt: "2026-04-03T03:20:00.000Z",
        goodnotesLastTestSentAt: "2026-04-03T03:20:00.000Z",
        goodnotesLastDeliveryStatus: "success",
        goodnotesLastDeliveryMessage:
          "Welcome note sent. Goodnotes delivery is ready for this destination.",
      },
    });

    getProfileByEmailMock.mockResolvedValue(existingProfile);
    updateStudentGoodnotesDeliveryMock.mockResolvedValue(updatedProfile);
    sendTestBriefToGoodnotesMock.mockResolvedValue({
      messageId: "smtp-message-id",
      attachmentFileName:
        "2026-04-03_DailySparks_WelcomeNote_MYP_getting-started_test.pdf",
    });

    const response = await goodnotesWelcomeNoteTestRoute(
      new Request("http://localhost:3000/api/admin/goodnotes-welcome-note-test", {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          parentEmail: "admin@geledtech.com",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getProfileByEmailMock).toHaveBeenCalledWith("admin@geledtech.com");
    expect(sendTestBriefToGoodnotesMock).toHaveBeenCalledWith(existingProfile);
    expect(updateStudentGoodnotesDeliveryMock).toHaveBeenCalledWith(
      "admin@geledtech.com",
      expect.objectContaining({
        goodnotesConnected: true,
        goodnotesLastDeliveryStatus: "success",
      }),
    );
    expect(body.parentEmail).toBe("admin@geledtech.com");
    expect(body.message).toMatch(/welcome note sent/i);
    expect(body.delivery).toMatchObject({
      attachmentFileName:
        "2026-04-03_DailySparks_WelcomeNote_MYP_getting-started_test.pdf",
    });
  });
});
