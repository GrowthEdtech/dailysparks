import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const {
  sendTrialEndingReminderNotificationMock,
  sendBillingStatusUpdateNotificationMock,
} = vi.hoisted(() => ({
  sendTrialEndingReminderNotificationMock: vi.fn(),
  sendBillingStatusUpdateNotificationMock: vi.fn(),
}));

const { revalidatePathMock } = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
}));

vi.mock("../../../../lib/planned-notification-emails", () => ({
  sendTrialEndingReminderNotification: (...args: unknown[]) =>
    sendTrialEndingReminderNotificationMock(...args),
  sendBillingStatusUpdateNotification: (...args: unknown[]) =>
    sendBillingStatusUpdateNotificationMock(...args),
  sendDeliverySupportAlertNotification: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

import { POST as adminLogin } from "../login/route";
import { POST as plannedNotificationBatchActionRoute } from "./route";
import {
  EDITORIAL_ADMIN_SESSION_COOKIE_NAME,
} from "../../../../lib/editorial-admin-auth";
import {
  getOrCreateParentProfile,
  updateParentSubscription,
  updateStudentPreferences,
} from "../../../../lib/mvp-store";
import { listPlannedNotificationRunHistory } from "../../../../lib/planned-notification-history-store";

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
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-05T12:00:00.000Z"));
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-planned-notification-batch-action-"),
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
  revalidatePathMock.mockReset();
});

afterEach(async () => {
  vi.useRealTimers();
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("admin planned notification batch action route", () => {
  test("batch resends multiple notifications and records per-item history", async () => {
    const cookie = await signIn();
    await createTrialProfile("family@example.com");
    await createBillingProfile("billing@example.com");

    sendTrialEndingReminderNotificationMock.mockResolvedValue({
      sent: true,
      skipped: false,
      reason: null,
      messageId: "trial-message-1",
      subject: "Your Daily Sparks trial ends soon",
    });
    sendBillingStatusUpdateNotificationMock.mockResolvedValue({
      sent: true,
      skipped: false,
      reason: null,
      messageId: "billing-message-1",
      subject: "Your Daily Sparks invoice is ready",
    });

    const response = await plannedNotificationBatchActionRoute(
      new Request("http://localhost:3000/api/admin/planned-notification-batch-action", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie,
        },
        body: JSON.stringify({
          action: "resend",
          items: [
            {
              parentEmail: "family@example.com",
              notificationFamily: "trial-ending-reminder",
            },
            {
              parentEmail: "billing@example.com",
              notificationFamily: "billing-status-update",
            },
          ],
        }),
      }),
    );
    const body = await response.json();
    const history = await listPlannedNotificationRunHistory();

    expect(response.status).toBe(200);
    expect(body.successCount).toBe(2);
    expect(body.failureCount).toBe(0);
    expect(history[0]).toMatchObject({
      source: "batch-resend",
    });
    expect(history[1]).toMatchObject({
      source: "batch-resend",
    });
  });
});
