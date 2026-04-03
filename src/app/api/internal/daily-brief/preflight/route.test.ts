import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const { emitDailyBriefOpsAlertMock } = vi.hoisted(() => ({
  emitDailyBriefOpsAlertMock: vi.fn(),
}));

vi.mock("../../../../../lib/daily-brief-ops-alerts", () => ({
  emitDailyBriefOpsAlert: (...args: unknown[]) =>
    emitDailyBriefOpsAlertMock(...args),
}));

import { POST as preflightDailyBriefRoute } from "./route";
import {
  createDailyBriefHistoryEntry,
  listDailyBriefHistory,
} from "../../../../../lib/daily-brief-history-store";

const ORIGINAL_ENV = { ...process.env };
let tempDirectory = "";
const SCHEDULER_HEADER_FIXTURE = ["scheduler", "header", "fixture"].join("-");

function buildRequest(
  schedulerHeaderValue = SCHEDULER_HEADER_FIXTURE,
  body?: Record<string, unknown>,
) {
  return new Request(
    "http://localhost:3000/api/internal/daily-brief/preflight",
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

function buildHistoryInput(
  overrides: Partial<Parameters<typeof createDailyBriefHistoryEntry>[0]> = {},
) {
  return {
    scheduledFor: "2026-04-03",
    headline: "Students map sea turtles",
    summary: "Families explore why migration tracking matters.",
    programme: "PYP" as const,
    status: "draft" as const,
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
    promptVersionLabel: "v1.0.0",
    promptVersion: "v1.0.0",
    repetitionRisk: "low" as const,
    repetitionNotes: "No recent overlap.",
    adminNotes: "",
    briefMarkdown: "## Today\nStudents track turtle migration.",
    pipelineStage: "generated" as const,
    candidateSnapshotAt: "2026-04-03T05:00:00.000Z",
    generationCompletedAt: "2026-04-03T06:00:00.000Z",
    pdfBuiltAt: null,
    deliveryWindowAt: "2026-04-03T01:00:00.000Z",
    lastDeliveryAttemptAt: null,
    deliveryAttemptCount: 0,
    deliverySuccessCount: 0,
    deliveryFailureCount: 0,
    failureReason: "",
    retryEligibleUntil: null,
    ...overrides,
  };
}

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-preflight-route-"),
  );
  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: "test",
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_DAILY_BRIEF_STORE_PATH: path.join(
      tempDirectory,
      "daily-brief-history.json",
    ),
    DAILY_SPARKS_SCHEDULER_SECRET: SCHEDULER_HEADER_FIXTURE,
  };

  emitDailyBriefOpsAlertMock.mockReset();
  emitDailyBriefOpsAlertMock.mockResolvedValue({
    delivered: false,
    usedWebhook: false,
  });
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("daily brief preflight route", () => {
  test("blocks dispatch when no generated briefs exist", async () => {
    const response = await preflightDailyBriefRoute(
      buildRequest(SCHEDULER_HEADER_FIXTURE, {
        runDate: "2026-04-03",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mode).toBe("preflight");
    expect(body.ready).toBe(false);
    expect(body.blockers[0]).toMatch(/no generated briefs/i);
    expect(body.summary.historyEntryCount).toBe(0);
    expect(emitDailyBriefOpsAlertMock).toHaveBeenCalledTimes(1);
    expect(emitDailyBriefOpsAlertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "preflight",
        severity: "critical",
        runDate: "2026-04-03",
      }),
    );
  });

  test("blocks dispatch when delivery-ready artifacts are missing", async () => {
    await createDailyBriefHistoryEntry(
      buildHistoryInput({
        deliveryWindowAt: null,
      }),
    );

    const response = await preflightDailyBriefRoute(
      buildRequest(SCHEDULER_HEADER_FIXTURE, {
        runDate: "2026-04-03",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ready).toBe(false);
    expect(body.blockers.join(" ")).toMatch(/delivery-ready/i);
    expect(body.summary.readyBriefCount).toBe(0);
    expect(body.summary.blockerCount).toBeGreaterThan(0);
  });

  test("blocks dispatch when generated briefs are missing required structured content", async () => {
    await createDailyBriefHistoryEntry(
      buildHistoryInput({
        headline: "",
        pdfBuiltAt: "2026-04-03T06:05:00.000Z",
      }),
    );

    const response = await preflightDailyBriefRoute(
      buildRequest(SCHEDULER_HEADER_FIXTURE, {
        runDate: "2026-04-03",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ready).toBe(false);
    expect(body.blockers.join(" ")).toMatch(/structured content/i);
    expect(body.summary.readyBriefCount).toBe(0);
  });

  test("marks ready briefs as approved and preflight_passed", async () => {
    await createDailyBriefHistoryEntry(
      buildHistoryInput({
        programme: "PYP",
        pdfBuiltAt: "2026-04-03T06:05:00.000Z",
      }),
    );
    await createDailyBriefHistoryEntry(
      buildHistoryInput({
        programme: "MYP",
        headline: "MYP turtle mapping brief",
        pdfBuiltAt: "2026-04-03T06:06:00.000Z",
      }),
    );

    const response = await preflightDailyBriefRoute(
      buildRequest(SCHEDULER_HEADER_FIXTURE, {
        runDate: "2026-04-03",
      }),
    );
    const body = await response.json();
    const history = await listDailyBriefHistory({
      scheduledFor: "2026-04-03",
    });

    expect(response.status).toBe(200);
    expect(body.ready).toBe(true);
    expect(body.blockers).toEqual([]);
    expect(body.summary.approvedCount).toBe(2);
    expect(emitDailyBriefOpsAlertMock).not.toHaveBeenCalled();
    expect(history.every((entry) => entry.status === "approved")).toBe(true);
    expect(
      history.every((entry) => entry.pipelineStage === "preflight_passed"),
    ).toBe(true);
  });

  test("treats already-approved briefs as a ready no-op during later backstop preflight waves", async () => {
    await createDailyBriefHistoryEntry(
      buildHistoryInput({
        status: "approved",
        pipelineStage: "preflight_passed",
        pdfBuiltAt: "2026-04-03T02:05:00.000Z",
      }),
    );

    const response = await preflightDailyBriefRoute(
      buildRequest(SCHEDULER_HEADER_FIXTURE, {
        runDate: "2026-04-03",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ready).toBe(true);
    expect(body.blockers).toEqual([]);
    expect(body.summary.readyBriefCount).toBe(1);
    expect(body.summary.approvedCount).toBe(0);
    expect(body.summary.alreadyApprovedCount).toBe(1);
    expect(emitDailyBriefOpsAlertMock).not.toHaveBeenCalled();
  });
});
