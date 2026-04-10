import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const { sendMarketingLeadStarterKitEmailMock } = vi.hoisted(() => ({
  sendMarketingLeadStarterKitEmailMock: vi.fn(),
}));

vi.mock("../../../../lib/marketing-lead-email", () => ({
  sendMarketingLeadStarterKitEmail: sendMarketingLeadStarterKitEmailMock,
}));

import { POST } from "./route";
import { listMarketingLeads } from "../../../../lib/marketing-lead-store";
import {
  createMarketingReferralInvite,
  listMarketingReferralInvites,
} from "../../../../lib/marketing-referral-store";

const ORIGINAL_ENV = { ...process.env };
let tempDirectory = "";

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-marketing-route-"),
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
    DAILY_SPARKS_MARKETING_REFERRAL_STORE_PATH: path.join(
      tempDirectory,
      "marketing-referrals.json",
    ),
  };
  sendMarketingLeadStarterKitEmailMock.mockReset();
  sendMarketingLeadStarterKitEmailMock.mockResolvedValue({
    sent: true,
    skipped: false,
    reason: null,
    messageId: "starter-kit-message-id",
  });
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("marketing lead capture route", () => {
  test("captures a starter kit lead and returns a success payload", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/marketing/leads", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          fullName: "Parent Example",
          email: "parent@example.com",
          childStageInterest: "DP",
          pagePath: "/ib-parent-starter-kit",
          utmSource: "google",
          utmMedium: "organic",
        }),
      }),
    );

    const body = await response.json();
    const leads = await listMarketingLeads();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        isNewLead: true,
        deliveryStatus: "sent",
        starterKitHref: "/ib-parent-starter-kit",
      }),
    );
    expect(leads).toHaveLength(1);
    expect(leads[0]).toEqual(
      expect.objectContaining({
        email: "parent@example.com",
        childStageInterest: "DP",
        deliveryStatus: "sent",
      }),
    );
  });

  test("rejects invalid emails before persisting a lead", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/marketing/leads", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          fullName: "Parent Example",
          email: "not-an-email",
        }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toMatch(/valid parent email/i);
    expect(await listMarketingLeads()).toEqual([]);
  });

  test("marks a referral invite as accepted when the starter kit submission includes a valid token", async () => {
    const invite = await createMarketingReferralInvite({
      referrerParentId: "parent-1",
      referrerParentEmail: "parent@example.com",
      referrerParentFullName: "Parent Example",
      inviteeEmail: "friend@example.com",
      inviteeFullName: "Friend Example",
      inviteeStageInterest: "DP",
      sourcePath: "/dashboard",
    });

    const response = await POST(
      new Request("http://localhost:3000/api/marketing/leads", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          fullName: "Friend Example",
          email: "friend@example.com",
          childStageInterest: "DP",
          pagePath: "/ib-parent-starter-kit",
          referralToken: invite.token,
        }),
      }),
    );

    const body = await response.json();
    const invites = await listMarketingReferralInvites({
      referrerParentId: "parent-1",
    });

    expect(response.status).toBe(200);
    expect(body.deliveryStatus).toBe("sent");
    expect(invites[0].acceptedAt).toBeTruthy();
  });
});
