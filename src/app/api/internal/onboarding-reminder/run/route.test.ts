import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const { sendOnboardingReminderEmailMock } = vi.hoisted(() => ({
  sendOnboardingReminderEmailMock: vi.fn(),
}));

vi.mock("../../../../../lib/onboarding-reminder-email", () => ({
  sendOnboardingReminderEmail: (...args: unknown[]) =>
    sendOnboardingReminderEmailMock(...args),
}));

import { POST as onboardingReminderRoute } from "./route";
import {
  getOrCreateParentProfile,
  getProfileByEmail,
  updateParentOnboardingReminder,
  updateParentSubscription,
  updateStudentGoodnotesDelivery,
  updateStudentPreferences,
} from "../../../../../lib/mvp-store";

const ORIGINAL_ENV = { ...process.env };
const SCHEDULER_HEADER_FIXTURE = "scheduler-header-fixture";

function buildRequest(
  schedulerHeaderValue = SCHEDULER_HEADER_FIXTURE,
  body?: Record<string, unknown>,
) {
  return new Request(
    "http://localhost:3000/api/internal/onboarding-reminder/run",
    {
      method: "POST",
      headers: {
        "x-daily-sparks-scheduler-secret": schedulerHeaderValue,
        ...(body ? { "content-type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  );
}

let tempDirectory = "";

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-onboarding-reminders-"),
  );

  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: "test",
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_STORE_PATH: path.join(tempDirectory, "mvp-store.json"),
    DAILY_SPARKS_SCHEDULER_SECRET: SCHEDULER_HEADER_FIXTURE,
  };

  sendOnboardingReminderEmailMock.mockReset();
  sendOnboardingReminderEmailMock.mockResolvedValue({
    messageId: "onboarding-message-id",
    subject: "Connect Goodnotes to start receiving Daily Sparks",
  });
});

afterEach(async () => {
  vi.useRealTimers();
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

async function seedReminderCandidate(email: string) {
  await getOrCreateParentProfile({
    email,
    fullName: "Parent Example",
    studentName: "Katherine",
  });
  await updateParentSubscription(email, {
    subscriptionStatus: "trial",
    trialEndsAt: "2026-04-08T00:00:00.000Z",
  });
  await updateStudentPreferences(email, {
    studentName: "Katherine",
    programme: "PYP",
    programmeYear: 5,
    goodnotesEmail: "",
  });
}

describe("onboarding reminder scheduler route", () => {
  test("rejects requests with an invalid scheduler secret", async () => {
    const response = await onboardingReminderRoute(buildRequest("wrong-secret"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toMatch(/scheduler/i);
  });

  test("sends a reminder to due families and updates reminder tracking", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T00:00:00.000Z"));
    await seedReminderCandidate("parent@example.com");
    vi.setSystemTime(new Date("2026-04-02T01:30:00.000Z"));

    const response = await onboardingReminderRoute(buildRequest());
    const body = await response.json();
    const updated = await getProfileByEmail("parent@example.com");

    expect(response.status).toBe(200);
    expect(body.mode).toBe("onboarding-reminder");
    expect(body.summary.checkedProfileCount).toBe(1);
    expect(body.summary.eligibleProfileCount).toBe(1);
    expect(body.summary.dueProfileCount).toBe(1);
    expect(body.summary.sentCount).toBe(1);
    expect(body.summary.failedCount).toBe(0);
    expect(body.sent).toEqual([
      expect.objectContaining({
        parentEmail: "parent@example.com",
        stageIndex: 1,
      }),
    ]);
    expect(sendOnboardingReminderEmailMock).toHaveBeenCalledTimes(1);
    expect(updated?.parent.onboardingReminderCount).toBe(1);
    expect(updated?.parent.onboardingReminderLastStage).toBe(1);
    expect(updated?.parent.onboardingReminderLastStatus).toBe("sent");
    expect(updated?.parent.onboardingReminderLastMessageId).toBe(
      "onboarding-message-id",
    );
  });

  test("skips non-due families with structured reasons", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T00:00:00.000Z"));
    await seedReminderCandidate("healthy@example.com");
    await updateStudentPreferences("healthy@example.com", {
      studentName: "Katherine",
      programme: "PYP",
      programmeYear: 5,
      goodnotesEmail: "katherine@goodnotes.email",
    });
    await updateStudentGoodnotesDelivery("healthy@example.com", {
      goodnotesConnected: true,
      goodnotesLastDeliveryStatus: "success",
    });

    await seedReminderCandidate("too-soon@example.com");
    await updateParentOnboardingReminder("too-soon@example.com", {
      onboardingReminderCount: 1,
      onboardingReminderLastAttemptAt: "2026-04-02T01:00:00.000Z",
      onboardingReminderLastSentAt: "2026-04-02T01:00:05.000Z",
      onboardingReminderLastStage: 1,
      onboardingReminderLastStatus: "sent",
      });

    vi.setSystemTime(new Date("2026-04-02T01:30:00.000Z"));

    const response = await onboardingReminderRoute(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary.sentCount).toBe(0);
    expect(body.summary.skippedCount).toBe(2);
    expect(body.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          parentEmail: "healthy@example.com",
          reason: expect.stringMatching(/dispatchable channel/i),
        }),
        expect.objectContaining({
          parentEmail: "too-soon@example.com",
          reason: expect.stringMatching(/not reached|cooling down/i),
        }),
      ]),
    );
  });

  test("records failed attempts and throttles the next retry window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T00:00:00.000Z"));
    await seedReminderCandidate("failed@example.com");
    vi.setSystemTime(new Date("2026-04-02T01:30:00.000Z"));
    sendOnboardingReminderEmailMock.mockRejectedValueOnce(
      new Error("SMTP offline."),
    );

    const firstResponse = await onboardingReminderRoute(buildRequest());
    const firstBody = await firstResponse.json();
    const afterFailure = await getProfileByEmail("failed@example.com");

    expect(firstResponse.status).toBe(200);
    expect(firstBody.summary.failedCount).toBe(1);
    expect(afterFailure?.parent.onboardingReminderCount).toBe(0);
    expect(afterFailure?.parent.onboardingReminderLastStatus).toBe("failed");
    expect(afterFailure?.parent.onboardingReminderLastError).toMatch(/SMTP offline/i);

    sendOnboardingReminderEmailMock.mockResolvedValue({
      messageId: "retry-message-id",
      subject: "Connect Goodnotes to start receiving Daily Sparks",
    });

    const secondResponse = await onboardingReminderRoute(buildRequest());
    const secondBody = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    expect(secondBody.summary.sentCount).toBe(0);
    expect(secondBody.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          parentEmail: "failed@example.com",
          reason: expect.stringMatching(/cooling down/i),
        }),
      ]),
    );
    expect(sendOnboardingReminderEmailMock).toHaveBeenCalledTimes(1);
  });

  test("retries a failed reminder once the shorter failure cooldown has elapsed", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T00:00:00.000Z"));
    await seedReminderCandidate("retryable@example.com");
    await updateParentOnboardingReminder("retryable@example.com", {
      onboardingReminderLastAttemptAt: "2026-04-02T01:00:00.000Z",
      onboardingReminderLastStage: 1,
      onboardingReminderLastStatus: "failed",
      onboardingReminderLastError: "SMTP offline",
    });
    vi.setSystemTime(new Date("2026-04-02T03:30:00.000Z"));

    const response = await onboardingReminderRoute(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary.sentCount).toBe(1);
    expect(sendOnboardingReminderEmailMock).toHaveBeenCalledTimes(1);
  });
});
