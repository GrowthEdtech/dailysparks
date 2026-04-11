import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { POST as adminLogin } from "../login/route";
import {
  EDITORIAL_ADMIN_SESSION_COOKIE_NAME,
} from "../../../../lib/editorial-admin-auth";
import { GET, POST } from "./route";

const verifyIdTokenMock = vi.fn();
const createSessionCookieMock = vi.fn();
const verifySessionCookieMock = vi.fn();

vi.mock("../../../../lib/firebase-admin", () => ({
  getFirebaseAdminAuth: () => ({
    verifyIdToken: verifyIdTokenMock,
    createSessionCookie: createSessionCookieMock,
    verifySessionCookie: verifySessionCookieMock,
  }),
}));

const ORIGINAL_ENV = { ...process.env };
let tempDirectory = "";
const validAdminSecret = "open-sesame";

beforeEach(async () => {
  tempDirectory = await mkdtemp(path.join(tmpdir(), "geo-aio-route-"));
  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_GEO_AIO_EVIDENCE_STORE_PATH: path.join(
      tempDirectory,
      "geo-aio-evidence.json",
    ),
    DAILY_SPARKS_EDITORIAL_ADMIN_PASSWORD: validAdminSecret,
    DAILY_SPARKS_EDITORIAL_ADMIN_SESSION_SECRET:
      "test-editorial-admin-session-secret",
  };
  verifyIdTokenMock.mockReset();
  createSessionCookieMock.mockReset();
  verifySessionCookieMock.mockReset();
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

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

describe("geo aio evidence admin route", () => {
  test("creates and lists Google AI Overviews manual evidence for admins", async () => {
    const cookie = await signIn();

    const createResponse = await POST(
      new Request("http://localhost:3000/api/admin/geo-aio-evidence", {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          promptId: "prompt-1",
          promptTextSnapshot: "best IB reading workflow for parents",
          queryVariant: "best IB reading workflow for parents",
          aiOverviewStatus: "cited",
          citationUrls: ["https://dailysparks.geledtech.com/ib-parent-starter-kit"],
          dailySparksCited: true,
          observedAt: "2026-04-11T08:00:00.000Z",
          evidenceUrl: "https://google.com/search?q=best+IB+reading+workflow",
          screenshotUrl: "https://storage.example.com/aio-proof.png",
          notes: "AIO cited Daily Sparks.",
        }),
      }),
    );
    const createBody = await createResponse.json();

    expect(createResponse.status).toBe(200);
    expect(createBody.evidence.aiOverviewStatus).toBe("cited");

    const listResponse = await GET(
      new Request("http://localhost:3000/api/admin/geo-aio-evidence", {
        headers: {
          cookie,
        },
      }),
    );
    const listBody = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listBody.evidence).toHaveLength(1);
  });
});
