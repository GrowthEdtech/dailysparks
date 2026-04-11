import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  createMarketingReferralInvite,
  listMarketingReferralInvites,
  markMarketingReferralAccepted,
  markMarketingReferralTrialStarted,
  recordMarketingReferralInviteDelivery,
} from "./marketing-referral-store";

const ORIGINAL_ENV = { ...process.env };
let tempDirectory = "";

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-marketing-referrals-"),
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
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("marketing referral store", () => {
  test("dedupes invites by referrer parent and invitee email while refreshing the token", async () => {
    const firstInvite = await createMarketingReferralInvite({
      referrerParentId: "parent-1",
      referrerParentEmail: "parent@example.com",
      referrerParentFullName: "Parent Example",
      inviteeEmail: "friend@example.com",
      inviteeFullName: "Friend Example",
      inviteeStageInterest: "DP",
      sourcePath: "/dashboard",
    });

    const secondInvite = await createMarketingReferralInvite({
      referrerParentId: "parent-1",
      referrerParentEmail: "parent@example.com",
      referrerParentFullName: "Parent Example",
      inviteeEmail: "friend@example.com",
      inviteeFullName: "Friend Example",
      inviteeStageInterest: "MYP",
      sourcePath: "/dashboard",
    });

    const invites = await listMarketingReferralInvites({
      referrerParentId: "parent-1",
    });

    expect(firstInvite.id).toBe(secondInvite.id);
    expect(secondInvite.token).not.toBe(firstInvite.token);
    expect(invites).toHaveLength(1);
    expect(invites[0]).toEqual(
      expect.objectContaining({
        id: firstInvite.id,
        inviteeEmail: "friend@example.com",
        inviteeStageInterest: "MYP",
      }),
    );
  });

  test("records delivery, acceptance, and trial start milestones against an invite", async () => {
    const invite = await createMarketingReferralInvite({
      referrerParentId: "parent-1",
      referrerParentEmail: "parent@example.com",
      referrerParentFullName: "Parent Example",
      inviteeEmail: "friend@example.com",
      inviteeFullName: "Friend Example",
      inviteeStageInterest: "DP",
      sourcePath: "/dashboard",
    });

    const deliveredInvite = await recordMarketingReferralInviteDelivery({
      inviteId: invite.id,
      status: "sent",
      messageId: "message-1",
    });
    const acceptedInvite = await markMarketingReferralAccepted({
      token: invite.token,
      inviteeEmail: "friend@example.com",
    });
    const trialStartedInvite = await markMarketingReferralTrialStarted({
      inviteeEmail: "friend@example.com",
      inviteeParentId: "parent-2",
    });

    expect(deliveredInvite.deliveryStatus).toBe("sent");
    expect(deliveredInvite.sentAt).toBeTruthy();
    expect(acceptedInvite?.acceptedAt).toBeTruthy();
    expect(trialStartedInvite?.trialStartedAt).toBeTruthy();
    expect(trialStartedInvite?.inviteeParentId).toBe("parent-2");
  });

  test("does not mark trial started for unaccepted invites", async () => {
    await createMarketingReferralInvite({
      referrerParentId: "parent-1",
      referrerParentEmail: "parent@example.com",
      referrerParentFullName: "Parent Example",
      inviteeEmail: "friend@example.com",
      inviteeFullName: "Friend Example",
      inviteeStageInterest: "DP",
      sourcePath: "/dashboard",
    });

    const trialStartedInvite = await markMarketingReferralTrialStarted({
      inviteeEmail: "friend@example.com",
      inviteeParentId: "parent-2",
    });

    expect(trialStartedInvite).toBeNull();
  });

  test(
    "updates an older referral invite delivery by id even after more than 500 newer invites exist",
    async () => {
    const targetInvite = await createMarketingReferralInvite({
      referrerParentId: "parent-1",
      referrerParentEmail: "parent@example.com",
      referrerParentFullName: "Parent Example",
      inviteeEmail: "target@example.com",
      inviteeFullName: "Target Example",
      inviteeStageInterest: "DP",
      sourcePath: "/dashboard",
    });

    for (let index = 0; index < 500; index += 1) {
      await createMarketingReferralInvite({
        referrerParentId: `parent-${index + 2}`,
        referrerParentEmail: `referrer-${index}@example.com`,
        referrerParentFullName: `Referrer ${index}`,
        inviteeEmail: `friend-${index}@example.com`,
        inviteeFullName: `Friend ${index}`,
        inviteeStageInterest: "MYP",
        sourcePath: "/dashboard",
      });
    }

    await expect(
      recordMarketingReferralInviteDelivery({
        inviteId: targetInvite.id,
        status: "sent",
        messageId: "message-500",
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: targetInvite.id,
        deliveryStatus: "sent",
      }),
    );
    },
    15000,
  );
});
