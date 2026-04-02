import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  getDailyBriefSchedulerHeaderName,
  hasValidDailyBriefSchedulerSecret,
  isDailyBriefSchedulerConfigured,
} from "./daily-brief-run-auth";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_SCHEDULER_SECRET: "scheduler-secret",
  };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("daily brief run auth", () => {
  test("reports when scheduler auth is configured", () => {
    expect(isDailyBriefSchedulerConfigured()).toBe(true);
  });

  test("validates the scheduler secret header", () => {
    const request = new Request("http://localhost:3000/api/internal/daily-brief/run", {
      method: "POST",
      headers: {
        [getDailyBriefSchedulerHeaderName()]: "scheduler-secret",
      },
    });

    expect(hasValidDailyBriefSchedulerSecret(request)).toBe(true);
  });

  test("rejects missing scheduler headers", () => {
    const request = new Request("http://localhost:3000/api/internal/daily-brief/run", {
      method: "POST",
    });

    expect(hasValidDailyBriefSchedulerSecret(request)).toBe(false);
  });
});
