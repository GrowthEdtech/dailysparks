import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { POST as login } from "../../login/route";
import { GET as getDashboardReferrals } from "./route";
import { SESSION_COOKIE_NAME } from "../../../../lib/session";
import {
  createMarketingReferralInvite,
  recordMarketingReferralInviteDelivery,
} from "../../../../lib/marketing-referral-store";

const {
  verifyIdTokenMock,
  createSessionCookieMock,
  verifySessionCookieMock,
} = vi.hoisted(() => ({
  verifyIdTokenMock: vi.fn(),
  createSessionCookieMock: vi.fn(),
  verifySessionCookieMock: vi.fn(),
}));

vi.mock("../../../../lib/firebase-admin", () => ({
  getFirebaseAdminAuth: () => ({
    verifyIdToken: verifyIdTokenMock,
    createSessionCookie: createSessionCookieMock,
    verifySessionCookie: verifySessionCookieMock,
  }),
}));

const ORIGINAL_ENV = { ...process.env };
let tempDirectory = "";

async function signInParent() {
  verifyIdTokenMock.mockResolvedValue({
    uid: "firebase-parent-1",
    email: "parent@example.com",
    name: "Parent Example",
    auth_time: Math.floor(Date.now() / 1000),
  });
  createSessionCookieMock.mockResolvedValue("firebase-session-cookie");
  verifySessionCookieMock.mockResolvedValue({
    uid: "firebase-parent-1",
    email: "parent@example.com",
    name: "Parent Example",
  });

  await login(
    new Request("http://localhost:3000/api/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        idToken: "firebase-id-token",
      }),
    }),
  );

  return `${SESSION_COOKIE_NAME}=firebase-session-cookie`;
}

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-dashboard-referrals-"),
  );
  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_STORE_PATH: path.join(tempDirectory, "mvp-store.json"),
    DAILY_SPARKS_MARKETING_REFERRAL_STORE_PATH: path.join(
      tempDirectory,
      "marketing-referrals.json",
    ),
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

describe("dashboard referrals route", () => {
  test("returns a summary and recent invites for the logged-in parent", async () => {
    const cookie = await signInParent();
    const invite = await createMarketingReferralInvite({
      referrerParentId: "parent_123",
      referrerParentEmail: "parent@example.com",
      referrerParentFullName: "Parent Example",
      inviteeEmail: "friend@example.com",
      inviteeFullName: "Friend Example",
      inviteeStageInterest: "DP",
      sourcePath: "/dashboard",
    });
    await recordMarketingReferralInviteDelivery({
      inviteId: invite.id,
      status: "sent",
      messageId: "message-1",
    });

    const response = await getDashboardReferrals(
      new Request("http://localhost:3000/api/dashboard/referrals", {
        headers: {
          cookie,
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary.sentCount).toBe(1);
    expect(body.recentInvites).toHaveLength(1);
    expect(body.recentInvites[0].inviteeEmail).toBe("friend@example.com");
  });

  test("returns 401 when the parent is not logged in", async () => {
    const response = await getDashboardReferrals(
      new Request("http://localhost:3000/api/dashboard/referrals"),
    );

    expect(response.status).toBe(401);
  });
});
