import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { POST as login } from "../login/route";
import { POST as createReferralInvite } from "./route";
import { SESSION_COOKIE_NAME } from "../../../lib/session";
import { getOrCreateParentProfile } from "../../../lib/mvp-store";
import { updateParentGrowthMilestones } from "../../../lib/mvp-store";
import { listMarketingReferralInvites } from "../../../lib/marketing-referral-store";

const {
  verifyIdTokenMock,
  createSessionCookieMock,
  verifySessionCookieMock,
  sendMarketingReferralInviteEmailMock,
} = vi.hoisted(() => ({
  verifyIdTokenMock: vi.fn(),
  createSessionCookieMock: vi.fn(),
  verifySessionCookieMock: vi.fn(),
  sendMarketingReferralInviteEmailMock: vi.fn(),
}));

vi.mock("../../../lib/firebase-admin", () => ({
  getFirebaseAdminAuth: () => ({
    verifyIdToken: verifyIdTokenMock,
    createSessionCookie: createSessionCookieMock,
    verifySessionCookie: verifySessionCookieMock,
  }),
}));

vi.mock("../../../lib/marketing-referral-email", () => ({
  sendMarketingReferralInviteEmail: sendMarketingReferralInviteEmailMock,
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
    path.join(tmpdir(), "daily-sparks-referral-route-"),
  );
  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: "test",
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
  sendMarketingReferralInviteEmailMock.mockReset();
  sendMarketingReferralInviteEmailMock.mockResolvedValue({
    sent: true,
    skipped: false,
    reason: null,
    messageId: "referral-message-id",
  });
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("referral invite route", () => {
  test("returns 401 when a parent is not logged in", async () => {
    const response = await createReferralInvite(
      new Request("http://localhost:3000/api/referrals", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          inviteeEmail: "friend@example.com",
        }),
      }),
    );

    expect(response.status).toBe(401);
  });

  test("stores and sends a referral invite for an activated parent", async () => {
    const cookie = await signInParent();
    await getOrCreateParentProfile({
      email: "parent@example.com",
      fullName: "Parent Example",
      studentName: "Katherine",
    });
    await updateParentGrowthMilestones("parent@example.com", {
      firstBriefDeliveredAt: "2026-04-10T00:00:00.000Z",
    });

    const response = await createReferralInvite(
      new Request("http://localhost:3000/api/referrals", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie,
        },
        body: JSON.stringify({
          inviteeEmail: "friend@example.com",
          inviteeFullName: "Friend Example",
          inviteeStageInterest: "DP",
        }),
      }),
    );
    const body = await response.json();
    const invites = await listMarketingReferralInvites({
      referrerParentId: body.referrerParentId,
    });

    expect(response.status).toBe(200);
    expect(body.deliveryStatus).toBe("sent");
    expect(invites).toHaveLength(1);
    expect(invites[0].inviteeEmail).toBe("friend@example.com");
  });
});
