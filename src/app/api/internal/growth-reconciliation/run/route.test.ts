import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { POST as growthReconciliationRoute } from "./route";
import {
  getOrCreateParentProfile,
  updateParentOnboardingReminder,
  updateParentSubscription,
  updateStudentGoodnotesDelivery,
  updateStudentPreferences,
} from "../../../../../lib/mvp-store";

const ORIGINAL_ENV = { ...process.env };
const SCHEDULER_HEADER_FIXTURE = "scheduler-header-fixture";

function buildRequest(schedulerHeaderValue = SCHEDULER_HEADER_FIXTURE) {
  return new Request(
    "http://localhost:3000/api/internal/growth-reconciliation/run",
    {
      method: "POST",
      headers: {
        "x-daily-sparks-scheduler-secret": schedulerHeaderValue,
      },
    },
  );
}

let tempDirectory = "";

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-growth-reconciliation-"),
  );

  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: "test",
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_STORE_PATH: path.join(tempDirectory, "mvp-store.json"),
    DAILY_SPARKS_SCHEDULER_SECRET: SCHEDULER_HEADER_FIXTURE,
  };
});

afterEach(async () => {
  vi.useRealTimers();
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

async function seedProfile(email: string) {
  await getOrCreateParentProfile({
    email,
    fullName: "Parent Example",
    studentName: "Katherine",
  });
  await updateStudentPreferences(email, {
    studentName: "Katherine",
    programme: "PYP",
    programmeYear: 5,
    goodnotesEmail: "",
  });
}

describe("growth reconciliation route", () => {
  test("rejects requests with an invalid scheduler secret", async () => {
    const response = await growthReconciliationRoute(buildRequest("wrong-secret"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toMatch(/scheduler/i);
  });

  test("returns structured reconciliation counts for ops follow-up", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-04T02:00:00.000Z"));

    await seedProfile("trial-expiring@example.com");
    await updateParentSubscription("trial-expiring@example.com", {
      subscriptionStatus: "trial",
      trialEndsAt: "2026-04-05T00:00:00.000Z",
    });

    await seedProfile("active-no-channel@example.com");
    await updateParentSubscription("active-no-channel@example.com", {
      subscriptionStatus: "active",
      subscriptionPlan: "monthly",
      subscriptionActivatedAt: "2026-04-02T00:00:00.000Z",
      latestInvoiceId: "in_active_1",
      latestInvoiceStatus: "paid",
      latestInvoicePaidAt: "2026-04-02T00:00:00.000Z",
    });

    await seedProfile("active-no-delivery@example.com");
    await updateParentSubscription("active-no-delivery@example.com", {
      subscriptionStatus: "active",
      subscriptionPlan: "monthly",
      subscriptionActivatedAt: "2026-04-02T00:00:00.000Z",
      latestInvoiceId: "in_active_2",
      latestInvoiceStatus: "paid",
      latestInvoicePaidAt: "2026-04-02T00:00:00.000Z",
    });
    await updateStudentPreferences("active-no-delivery@example.com", {
      studentName: "Katherine",
      programme: "PYP",
      programmeYear: 5,
      goodnotesEmail: "katherine@goodnotes.email",
    });
    await updateStudentGoodnotesDelivery("active-no-delivery@example.com", {
      goodnotesConnected: true,
      goodnotesVerifiedAt: "2026-04-02T02:00:00.000Z",
      goodnotesLastDeliveryStatus: "success",
      goodnotesLastDeliveryMessage: "Ready.",
    });

    await seedProfile("failed-reminder@example.com");
    await updateParentOnboardingReminder("failed-reminder@example.com", {
      onboardingReminderLastAttemptAt: "2026-04-03T01:00:00.000Z",
      onboardingReminderLastStatus: "failed",
      onboardingReminderLastError: "SMTP offline",
    });

    const response = await growthReconciliationRoute(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mode).toBe("growth-reconciliation");
    expect(body.runDate).toBe("2026-04-04");
    expect(body.summary.checkedProfileCount).toBe(4);
    expect(body.summary.trialsExpiringSoonWithoutFirstBrief.count).toBe(1);
    expect(body.summary.activeWithoutDispatchableChannel.count).toBe(1);
    expect(body.summary.activeWithoutFirstSuccessfulDelivery.count).toBe(1);
    expect(body.summary.reminderFailuresBlockingActivation.count).toBe(1);
    expect(body.notificationRun).toMatchObject({
      trialEnding: expect.objectContaining({
        checkedCount: 1,
      }),
      billingStatus: expect.objectContaining({
        checkedCount: 2,
      }),
      deliverySupport: expect.objectContaining({
        checkedCount: 3,
      }),
    });
  });
});
