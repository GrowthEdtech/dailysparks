import { describe, expect, test, vi } from "vitest";

import { POST as adminLogin } from "../login/route";
import {
  EDITORIAL_ADMIN_SESSION_COOKIE_NAME,
} from "../../../../lib/editorial-admin-auth";
import { POST } from "./route";

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

const validAdminSecret = "open-sesame";

async function signIn() {
  process.env.DAILY_SPARKS_EDITORIAL_ADMIN_PASSWORD = validAdminSecret;
  process.env.DAILY_SPARKS_EDITORIAL_ADMIN_SESSION_SECRET =
    "test-editorial-admin-session-secret";

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

describe("geo content audit admin route", () => {
  test("returns a structured GEO audit result", async () => {
    const cookie = await signIn();

    const response = await POST(
      new Request("http://localhost:3000/api/admin/geo-content-audit", {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "How do commercial buyers compare LED suppliers?",
          headings: "## What matters most?",
          body: "## What matters most?\nCommercial buyers compare LED suppliers by reliability, warranty coverage, quoted energy savings, and evidence that products perform consistently across large installations. According to a 2025 report, verified retrofit projects reduced replacement costs by 18%.",
          referenceNotes: "Source: 2025 commercial lighting report.",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.result.summary).toBeTypeOf("string");
    expect(body.result.atomicAnswerCoverage.totalSections).toBeGreaterThan(0);
    expect(body.result.rankability.score).toBeTypeOf("number");
    expect(body.result.citationReadiness.score).toBeTypeOf("number");
    expect(body.result.biasResistance.score).toBeTypeOf("number");
  });
});
