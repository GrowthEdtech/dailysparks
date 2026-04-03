import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { emitDailyBriefOpsAlert } from "./daily-brief-ops-alerts";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

describe("daily brief ops alerts", () => {
  test("falls back to structured server logging when no webhook is configured", async () => {
    process.env = {
      ...ORIGINAL_ENV,
    };
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await emitDailyBriefOpsAlert({
      stage: "preflight",
      severity: "warning",
      runDate: "2026-04-03",
      title: "Preflight warning",
      message: "A warning happened.",
    });

    expect(result).toEqual({
      delivered: false,
      usedWebhook: false,
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  test("posts the alert payload to a webhook when configured", async () => {
    process.env = {
      ...ORIGINAL_ENV,
      DAILY_BRIEF_OPS_ALERT_WEBHOOK_URL: "https://ops.example.com/daily-brief",
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await emitDailyBriefOpsAlert({
      stage: "deliver",
      severity: "critical",
      runDate: "2026-04-03",
      title: "Delivery failed",
      message: "All configured deliveries failed.",
      details: {
        failedCount: 1,
      },
    });

    expect(result).toEqual({
      delivered: true,
      usedWebhook: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://ops.example.com/daily-brief",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});
