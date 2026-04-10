import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const { sendMarketingLeadNurtureEmailMock } = vi.hoisted(() => ({
  sendMarketingLeadNurtureEmailMock: vi.fn(),
}));

vi.mock("../../../../../../lib/marketing-lead-nurture-email", () => ({
  sendMarketingLeadNurtureEmail: (...args: unknown[]) =>
    sendMarketingLeadNurtureEmailMock(...args),
}));

import { POST as leadNurtureRoute } from "./route";
import { captureMarketingLead, listMarketingLeads } from "../../../../../../lib/marketing-lead-store";
import { getOrCreateParentProfile } from "../../../../../../lib/mvp-store";

const ORIGINAL_ENV = { ...process.env };
const SCHEDULER_HEADER_FIXTURE = "scheduler-header-fixture";

function buildRequest(schedulerHeaderValue = SCHEDULER_HEADER_FIXTURE) {
  return new Request(
    "http://localhost:3000/api/internal/marketing/lead-nurture/run",
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
    path.join(tmpdir(), "daily-sparks-marketing-lead-nurture-"),
  );

  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: "test",
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_STORE_PATH: path.join(tempDirectory, "mvp-store.json"),
    DAILY_SPARKS_MARKETING_LEAD_STORE_PATH: path.join(
      tempDirectory,
      "marketing-leads.json",
    ),
    DAILY_SPARKS_SCHEDULER_SECRET: SCHEDULER_HEADER_FIXTURE,
  };

  sendMarketingLeadNurtureEmailMock.mockReset();
  sendMarketingLeadNurtureEmailMock.mockResolvedValue({
    sent: true,
    skipped: false,
    reason: null,
    messageId: "nurture-message-id",
  });
});

afterEach(async () => {
  vi.useRealTimers();
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

async function seedLead(email: string) {
  const captured = await captureMarketingLead({
    email,
    fullName: "Parent Example",
    childStageInterest: "MYP",
    source: "ib-parent-starter-kit",
    pagePath: "/ib-parent-starter-kit",
    referrerUrl: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
  });

  return captured.lead.id;
}

describe("marketing lead nurture scheduler route", () => {
  test("rejects requests with an invalid scheduler secret", async () => {
    const response = await leadNurtureRoute(buildRequest("wrong-secret"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toMatch(/scheduler/i);
  });

  test("sends nurture emails to due leads and updates lead state", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T00:00:00.000Z"));
    await seedLead("parent@example.com");
    vi.setSystemTime(new Date("2026-04-11T02:00:00.000Z"));

    const response = await leadNurtureRoute(buildRequest());
    const body = await response.json();
    const [storedLead] = await listMarketingLeads({
      email: "parent@example.com",
      source: "ib-parent-starter-kit",
      limit: 1,
    });

    expect(response.status).toBe(200);
    expect(body.mode).toBe("marketing-lead-nurture");
    expect(body.summary.checkedLeadCount).toBe(1);
    expect(body.summary.eligibleLeadCount).toBe(1);
    expect(body.summary.dueLeadCount).toBe(1);
    expect(body.summary.sentCount).toBe(1);
    expect(body.summary.failedCount).toBe(0);
    expect(sendMarketingLeadNurtureEmailMock).toHaveBeenCalledTimes(1);
    expect(storedLead.nurtureEmailCount).toBe(1);
    expect(storedLead.nurtureLastStage).toBe(1);
    expect(storedLead.nurtureLastStatus).toBe("sent");
    expect(storedLead.nurtureLastMessageId).toBe("nurture-message-id");
  });

  test("skips converted or not-yet-due leads with structured reasons", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T00:00:00.000Z"));
    await seedLead("converted@example.com");
    await getOrCreateParentProfile({
      email: "converted@example.com",
      fullName: "Converted Parent",
      studentName: "Student Example",
    });
    vi.setSystemTime(new Date("2026-04-10T06:30:00.000Z"));
    await seedLead("too-soon@example.com");
    vi.setSystemTime(new Date("2026-04-10T08:00:00.000Z"));

    const response = await leadNurtureRoute(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary.sentCount).toBe(0);
    expect(body.summary.skippedCount).toBe(2);
    expect(body.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          leadEmail: "converted@example.com",
          reason: expect.stringMatching(/already converted/i),
        }),
        expect.objectContaining({
          leadEmail: "too-soon@example.com",
          reason: expect.stringMatching(/not reached/i),
        }),
      ]),
    );
  });

  test("records failed nurture attempts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T00:00:00.000Z"));
    await seedLead("failed@example.com");
    vi.setSystemTime(new Date("2026-04-11T02:00:00.000Z"));
    sendMarketingLeadNurtureEmailMock.mockRejectedValueOnce(
      new Error("SMTP offline."),
    );

    const response = await leadNurtureRoute(buildRequest());
    const body = await response.json();
    const [storedLead] = await listMarketingLeads({
      email: "failed@example.com",
      source: "ib-parent-starter-kit",
      limit: 1,
    });

    expect(response.status).toBe(200);
    expect(body.summary.failedCount).toBe(1);
    expect(storedLead.nurtureEmailCount).toBe(1);
    expect(storedLead.nurtureLastStage).toBe(1);
    expect(storedLead.nurtureLastStatus).toBe("failed");
    expect(storedLead.nurtureLastError).toMatch(/SMTP offline/i);
  });
});
