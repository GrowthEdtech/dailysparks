import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  createPlannedNotificationRunEntry,
  listPlannedNotificationRunHistory,
} from "./planned-notification-history-store";

const ORIGINAL_ENV = { ...process.env };
let tempDirectory = "";

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-planned-notification-history-"),
  );

  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_PLANNED_NOTIFICATION_HISTORY_PATH: path.join(
      tempDirectory,
      "planned-notification-history.json",
    ),
  };
});

afterEach(async () => {
  vi.useRealTimers();
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("planned notification history store", () => {
  test("persists and returns manual resend and resolve entries in newest-first order", async () => {
    await createPlannedNotificationRunEntry({
      runAt: "2026-04-06T01:00:00.000Z",
      parentId: "parent-1",
      parentEmail: "family@example.com",
      notificationFamily: "trial-ending-reminder",
      source: "manual-resend",
      status: "sent",
      reason: "Manual resend requested by ops.",
      deduped: false,
      messageId: "message-1",
      errorMessage: null,
      trialEndsAt: "2026-04-08T00:00:00.000Z",
      invoiceId: null,
      invoiceStatus: null,
      reasonKey: null,
    });

    await createPlannedNotificationRunEntry({
      runAt: "2026-04-06T02:00:00.000Z",
      parentId: "parent-1",
      parentEmail: "family@example.com",
      notificationFamily: "trial-ending-reminder",
      source: "manual-resolve",
      status: "resolved",
      reason: "Ops confirmed the trial-ending follow-up outside email.",
      deduped: false,
      messageId: null,
      errorMessage: null,
      trialEndsAt: "2026-04-08T00:00:00.000Z",
      invoiceId: null,
      invoiceStatus: null,
      reasonKey: null,
    });

    const entries = await listPlannedNotificationRunHistory();

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      notificationFamily: "trial-ending-reminder",
      source: "manual-resolve",
      status: "resolved",
      reason: "Ops confirmed the trial-ending follow-up outside email.",
    });
    expect(entries[1]).toMatchObject({
      notificationFamily: "trial-ending-reminder",
      source: "manual-resend",
      status: "sent",
      messageId: "message-1",
    });
  });
});
