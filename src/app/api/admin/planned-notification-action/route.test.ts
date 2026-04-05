import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const {
  sendTrialEndingReminderNotificationMock,
  sendBillingStatusUpdateNotificationMock,
  sendDeliverySupportAlertNotificationMock,
} = vi.hoisted(() => ({
  sendTrialEndingReminderNotificationMock: vi.fn(),
  sendBillingStatusUpdateNotificationMock: vi.fn(),
  sendDeliverySupportAlertNotificationMock: vi.fn(),
}));

const { revalidatePathMock } = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
}));

vi.mock("../../../../lib/planned-notification-emails", () => ({
  sendTrialEndingReminderNotification: (...args: unknown[]) =>
    sendTrialEndingReminderNotificationMock(...args),
  sendBillingStatusUpdateNotification: (...args: unknown[]) =>
    sendBillingStatusUpdateNotificationMock(...args),
  sendDeliverySupportAlertNotification: (...args: unknown[]) =>
    sendDeliverySupportAlertNotificationMock(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

import { POST as adminLogin } from "../login/route";
import { POST as plannedNotificationActionRoute } from "./route";
import {
  createPlannedNotificationRunEntry,
  listPlannedNotificationRunHistory,
} from "../../../../lib/planned-notification-history-store";
import {
  EDITORIAL_ADMIN_SESSION_COOKIE_NAME,
} from "../../../../lib/editorial-admin-auth";
import {
  getOrCreateParentProfile,
  getProfileByEmail,
  updateParentSubscription,
  updateStudentPreferences,
} from "../../../../lib/mvp-store";

const ORIGINAL_ENV = { ...process.env };
const validAdminSecret = "open-sesame";
let tempDirectory = "";

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

async function createTrialProfile(email: string) {
  await getOrCreateParentProfile({
    email,
    fullName: "Family Example",
    studentName: "Harper",
  });
  await updateStudentPreferences(email, {
    studentName: "Harper",
    programme: "PYP",
    programmeYear: 5,
    goodnotesEmail: "family@goodnotes.email",
  });
  await updateParentSubscription(email, {
    subscriptionStatus: "trial",
    trialEndsAt: "2026-04-08T00:00:00.000Z",
  });
}

async function createBillingProfile(email: string) {
  await getOrCreateParentProfile({
    email,
    fullName: "Billing Family",
    studentName: "Morgan",
  });
  await updateStudentPreferences(email, {
    studentName: "Morgan",
    programme: "MYP",
    programmeYear: 2,
    goodnotesEmail: "billing@goodnotes.email",
  });
  await updateParentSubscription(email, {
    subscriptionStatus: "active",
    subscriptionPlan: "monthly",
    subscriptionActivatedAt: "2026-04-02T00:00:00.000Z",
    latestInvoiceId: "in_456",
    latestInvoiceStatus: "open",
  });
}

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-planned-notification-action-"),
  );

  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: "test",
    DAILY_SPARKS_EDITORIAL_ADMIN_PASSWORD: validAdminSecret,
    DAILY_SPARKS_EDITORIAL_ADMIN_SESSION_SECRET:
      "test-editorial-admin-session-secret",
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_STORE_PATH: path.join(tempDirectory, "mvp-store.json"),
    DAILY_SPARKS_PLANNED_NOTIFICATION_HISTORY_PATH: path.join(
      tempDirectory,
      "planned-notification-history.json",
    ),
  };

  sendTrialEndingReminderNotificationMock.mockReset();
  sendBillingStatusUpdateNotificationMock.mockReset();
  sendDeliverySupportAlertNotificationMock.mockReset();
  revalidatePathMock.mockReset();
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("admin planned notification action route", () => {
  test("manually resends the current trial ending reminder and records history", async () => {
    const cookie = await signIn();
    await createTrialProfile("family@example.com");
    sendTrialEndingReminderNotificationMock.mockResolvedValue({
      sent: true,
      skipped: false,
      reason: null,
      messageId: "trial-message-1",
      subject: "Your Daily Sparks trial ends soon",
    });

    const response = await plannedNotificationActionRoute(
      new Request("http://localhost:3000/api/admin/planned-notification-action", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie,
        },
        body: JSON.stringify({
          parentEmail: "family@example.com",
          notificationFamily: "trial-ending-reminder",
          action: "resend",
        }),
      }),
    );
    const body = await response.json();
    const profile = await getProfileByEmail("family@example.com");
    const history = await listPlannedNotificationRunHistory();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(sendTrialEndingReminderNotificationMock).toHaveBeenCalledTimes(1);
    expect(profile?.parent.trialEndingReminderLastNotifiedAt).toBeTruthy();
    expect(profile?.parent.trialEndingReminderLastTrialEndsAt).toBe(
      "2026-04-08T00:00:00.000Z",
    );
    expect(history[0]).toMatchObject({
      parentEmail: "family@example.com",
      notificationFamily: "trial-ending-reminder",
      source: "manual-resend",
      status: "sent",
      messageId: "trial-message-1",
    });
  });

  test("manually resolves the current billing notification state and records history", async () => {
    const cookie = await signIn();
    await createBillingProfile("billing@example.com");
    await createPlannedNotificationRunEntry({
      runAt: "2026-04-05T01:00:00.000Z",
      parentId: "seed-parent",
      parentEmail: "seed@example.com",
      notificationFamily: "trial-ending-reminder",
      source: "growth-reconciliation",
      status: "sent",
      reason: "Seed",
      deduped: false,
      messageId: "seed",
      errorMessage: null,
      invoiceId: null,
      invoiceStatus: null,
      trialEndsAt: "2026-04-08T00:00:00.000Z",
      reasonKey: null,
    });

    const response = await plannedNotificationActionRoute(
      new Request("http://localhost:3000/api/admin/planned-notification-action", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie,
        },
        body: JSON.stringify({
          parentEmail: "billing@example.com",
          notificationFamily: "billing-status-update",
          action: "resolve",
        }),
      }),
    );
    const body = await response.json();
    const profile = await getProfileByEmail("billing@example.com");
    const history = await listPlannedNotificationRunHistory();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(sendBillingStatusUpdateNotificationMock).not.toHaveBeenCalled();
    expect(profile?.parent.billingStatusNotificationLastResolvedAt).toBeTruthy();
    expect(profile?.parent.billingStatusNotificationLastResolvedInvoiceId).toBe(
      "in_456",
    );
    expect(profile?.parent.billingStatusNotificationLastResolvedInvoiceStatus).toBe(
      "open",
    );
    expect(history[0]).toMatchObject({
      parentEmail: "billing@example.com",
      notificationFamily: "billing-status-update",
      source: "manual-resolve",
      status: "resolved",
      invoiceId: "in_456",
      invoiceStatus: "open",
    });
  });

  test("records assignee and ops note collaboration metadata for the current state", async () => {
    const cookie = await signIn();
    await createTrialProfile("handoff@example.com");

    const response = await plannedNotificationActionRoute(
      new Request("http://localhost:3000/api/admin/planned-notification-action", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie,
        },
        body: JSON.stringify({
          parentEmail: "handoff@example.com",
          notificationFamily: "trial-ending-reminder",
          action: "annotate",
          assignee: "Mae",
          opsNote: "Hold until parent confirms billing.",
        }),
      }),
    );
    const body = await response.json();
    const history = await listPlannedNotificationRunHistory();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(history[0]).toMatchObject({
      parentEmail: "handoff@example.com",
      notificationFamily: "trial-ending-reminder",
      source: "manual-annotate",
      status: "annotated",
      assignee: "Mae",
      opsNote: "Hold until parent confirms billing.",
    });
  });
});
