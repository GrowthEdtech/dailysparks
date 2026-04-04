import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  createOnboardingReminderRunEntry,
  listOnboardingReminderRunHistory,
} from "./onboarding-reminder-history-store";

const ORIGINAL_ENV = { ...process.env };
let tempDirectory = "";

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-onboarding-reminder-history-"),
  );

  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: "test",
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_ONBOARDING_REMINDER_HISTORY_PATH: path.join(
      tempDirectory,
      "onboarding-reminder-history.json",
    ),
  };
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("onboarding reminder history store", () => {
  test("creates immutable sent and failed reminder attempt records", async () => {
    const sent = await createOnboardingReminderRunEntry({
      runAt: "2026-04-04T01:30:00.000Z",
      parentId: "parent-1",
      parentEmail: "parent@example.com",
      stageIndex: 1,
      stageLabel: "First activation reminder",
      status: "sent",
      messageId: "message-1",
      errorMessage: null,
    });
    const failed = await createOnboardingReminderRunEntry({
      runAt: "2026-04-04T03:30:00.000Z",
      parentId: "parent-2",
      parentEmail: "failed@example.com",
      stageIndex: 1,
      stageLabel: "First activation reminder",
      status: "failed",
      messageId: null,
      errorMessage: "SMTP offline",
    });

    const history = await listOnboardingReminderRunHistory();

    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({
      id: failed.id,
      parentEmail: "failed@example.com",
      runDate: "2026-04-04",
      status: "failed",
      errorMessage: "SMTP offline",
    });
    expect(history[1]).toMatchObject({
      id: sent.id,
      parentEmail: "parent@example.com",
      runDate: "2026-04-04",
      status: "sent",
      messageId: "message-1",
    });
  });
});
