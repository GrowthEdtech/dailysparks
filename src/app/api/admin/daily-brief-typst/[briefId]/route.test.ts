import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const { renderOutboundDailyBriefTypstPrototypeMock } = vi.hoisted(() => ({
  renderOutboundDailyBriefTypstPrototypeMock: vi.fn(),
}));

vi.mock("../../../../../lib/outbound-daily-brief-typst", () => ({
  renderOutboundDailyBriefTypstPrototype: (...args: unknown[]) =>
    renderOutboundDailyBriefTypstPrototypeMock(...args),
}));

import { POST as adminLogin } from "../../login/route";
import { GET as dailyBriefTypstRoute } from "./route";
import { createDailyBriefHistoryEntry } from "../../../../../lib/daily-brief-history-store";
import {
  EDITORIAL_ADMIN_SESSION_COOKIE_NAME,
} from "../../../../../lib/editorial-admin-auth";

const ORIGINAL_ENV = { ...process.env };
const validAdminSecret = "open-sesame";
let tempDirectory = "";

function buildHistoryInput(
  overrides: Partial<Parameters<typeof createDailyBriefHistoryEntry>[0]> = {},
) {
  return {
    scheduledFor: "2026-04-10",
    recordKind: "production" as const,
    headline: "Students study coral reef protection",
    summary: "Families explore how reefs support ocean life.",
    programme: "PYP" as const,
    editorialCohort: "APAC" as const,
    status: "published" as const,
    topicTags: ["oceans", "science"],
    sourceReferences: [
      {
        sourceId: "bbc",
        sourceName: "BBC",
        sourceDomain: "bbc.com",
        articleTitle: "Students study coral reef protection",
        articleUrl: "https://www.bbc.com/news/world-123",
      },
    ],
    aiConnectionId: "nf-relay",
    aiConnectionName: "NF Relay",
    aiModel: "gpt-5.4",
    promptPolicyId: "policy-1",
    promptVersionLabel: "v1.1.1",
    promptVersion: "v1.1.1",
    repetitionRisk: "low" as const,
    repetitionNotes: "No recent overlap.",
    adminNotes: "",
    briefMarkdown:
      "What’s happening? Students explore how coral reefs are protected.",
    pipelineStage: "published" as const,
    candidateSnapshotAt: "2026-04-10T05:00:00.000Z",
    generationCompletedAt: "2026-04-10T06:00:00.000Z",
    pdfBuiltAt: "2026-04-10T06:05:00.000Z",
    deliveryWindowAt: "2026-04-10T01:00:00.000Z",
    lastDeliveryAttemptAt: "2026-04-10T01:00:00.000Z",
    deliveryAttemptCount: 1,
    deliverySuccessCount: 1,
    deliveryFailureCount: 0,
    ...overrides,
  };
}

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

beforeEach(async () => {
  tempDirectory = await mkdtemp(path.join(tmpdir(), "daily-sparks-admin-typst-"));

  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: "test",
    DAILY_SPARKS_EDITORIAL_ADMIN_PASSWORD: validAdminSecret,
    DAILY_SPARKS_EDITORIAL_ADMIN_SESSION_SECRET:
      "test-editorial-admin-session-secret",
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_STORE_PATH: path.join(tempDirectory, "mvp-store.json"),
    DAILY_SPARKS_DAILY_BRIEF_STORE_PATH: path.join(
      tempDirectory,
      "daily-brief-history.json",
    ),
  };
  renderOutboundDailyBriefTypstPrototypeMock.mockReset();
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("admin daily brief typst route", () => {
  test("rejects unauthenticated requests", async () => {
    const response = await dailyBriefTypstRoute(
      new Request("http://localhost:3000/api/admin/daily-brief-typst/brief-1"),
      {
        params: Promise.resolve({ briefId: "brief-1" }),
      },
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      message: expect.stringMatching(/editorial admin/i),
    });
  });

  test("returns a typst prototype pdf for an existing daily brief record", async () => {
    const cookie = await signIn();
    const brief = await createDailyBriefHistoryEntry(buildHistoryInput());
    const pdfBuffer = Buffer.from("%PDF typst prototype");

    renderOutboundDailyBriefTypstPrototypeMock.mockResolvedValue({
      pdf: pdfBuffer,
      source: "= Typst prototype",
      fileName: "prototype.pdf",
    });

    const response = await dailyBriefTypstRoute(
      new Request(
        `http://localhost:3000/api/admin/daily-brief-typst/${brief.id}`,
        {
          headers: {
            cookie,
          },
        },
      ),
      {
        params: Promise.resolve({ briefId: brief.id }),
      },
    );

    expect(response.status).toBe(200);
    expect(renderOutboundDailyBriefTypstPrototypeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: brief.id,
        headline: "Students study coral reef protection",
      }),
    );
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain(
      'filename="prototype.pdf"',
    );
    expect(Buffer.from(await response.arrayBuffer())).toEqual(pdfBuffer);
  });
});
