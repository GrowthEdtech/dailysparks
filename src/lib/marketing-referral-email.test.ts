import { describe, expect, test } from "vitest";

import {
  buildMarketingReferralInviteEmail,
} from "./marketing-referral-email";

describe("marketing referral invite email", () => {
  test("builds a calm parent-facing referral invite with a starter-kit link", () => {
    const email = buildMarketingReferralInviteEmail({
      invite: {
        id: "invite-1",
        token: "ref-token-1",
        referrerParentId: "parent-1",
        referrerParentEmail: "parent@example.com",
        referrerParentFullName: "Parent Example",
        inviteeEmail: "friend@example.com",
        inviteeFullName: "Friend Example",
        inviteeStageInterest: "DP",
        sourcePath: "/dashboard",
        deliveryStatus: "pending",
        deliveryMessageId: null,
        deliveryErrorMessage: null,
        sentAt: null,
        acceptedAt: null,
        trialStartedAt: null,
        inviteeParentId: null,
        createdAt: "2026-04-10T00:00:00.000Z",
        updatedAt: "2026-04-10T00:00:00.000Z",
      },
      appBaseUrl: "https://dailysparks.geledtech.com",
    });

    expect(email.subject).toContain("Daily Sparks");
    expect(email.html).toContain("Parent Example");
    expect(email.html).toContain("/ib-parent-starter-kit?ref=ref-token-1");
    expect(email.text).toContain("starter kit");
  });
});
