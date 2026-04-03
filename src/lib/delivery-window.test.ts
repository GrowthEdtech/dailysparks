import { describe, expect, test } from "vitest";

import {
  assessProfileDeliveryWindow,
  buildProfileLocalDeliveryWindowLabel,
  splitProfilesByDeliveryWindow,
} from "./delivery-window";
import type { ParentProfile } from "./mvp-types";

function buildProfile(
  overrides: Partial<ParentProfile["parent"]> = {},
): ParentProfile {
  return {
    parent: {
      id: "parent-1",
      email: "parent@example.com",
      fullName: "Parent Example",
      countryCode: "HK",
      deliveryTimeZone: "Asia/Hong_Kong",
      preferredDeliveryLocalTime: "09:00",
      subscriptionStatus: "active",
      subscriptionPlan: "monthly",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      trialStartedAt: "2026-04-01T00:00:00.000Z",
      trialEndsAt: "2026-04-08T00:00:00.000Z",
      subscriptionActivatedAt: "2026-04-01T00:00:00.000Z",
      subscriptionRenewalAt: "2026-05-01T00:00:00.000Z",
      latestInvoiceId: null,
      latestInvoiceNumber: null,
      latestInvoiceStatus: null,
      latestInvoiceHostedUrl: null,
      latestInvoicePdfUrl: null,
      latestInvoiceAmountPaid: null,
      latestInvoiceCurrency: null,
      latestInvoicePaidAt: null,
      latestInvoicePeriodStart: null,
      latestInvoicePeriodEnd: null,
      notionWorkspaceId: null,
      notionWorkspaceName: null,
      notionBotId: null,
      notionDatabaseId: null,
      notionDatabaseName: null,
      notionDataSourceId: null,
      notionAuthorizedAt: null,
      notionLastSyncedAt: null,
      notionLastSyncStatus: null,
      notionLastSyncMessage: null,
      notionLastSyncPageId: null,
      notionLastSyncPageUrl: null,
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
      ...overrides,
    },
    student: {
      id: "student-1",
      parentId: "parent-1",
      studentName: "Katherine",
      programme: "PYP",
      programmeYear: 5,
      goodnotesEmail: "parent@goodnotes.email",
      goodnotesConnected: true,
      goodnotesVerifiedAt: "2026-04-01T00:00:00.000Z",
      goodnotesLastTestSentAt: null,
      goodnotesLastDeliveryStatus: "success",
      goodnotesLastDeliveryMessage: "Ready.",
      notionConnected: false,
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
    },
  };
}

describe("delivery window helpers", () => {
  test("marks a profile due once its local delivery time has arrived", () => {
    const hkProfile = buildProfile();
    const assessment = assessProfileDeliveryWindow({
      profile: hkProfile,
      runDate: "2026-04-03",
      dispatchTimestamp: "2026-04-03T01:00:00.000Z",
    });

    expect(assessment.due).toBe(true);
    expect(assessment.localDate).toBe("2026-04-03");
    expect(assessment.windowLabel).toBe("9:00 AM · Asia/Hong Kong");
  });

  test("keeps future local windows pending until the family reaches the target time", () => {
    const newYorkProfile = buildProfile({
      countryCode: "US",
      deliveryTimeZone: "America/New_York",
      preferredDeliveryLocalTime: "09:00",
    });
    const assessment = assessProfileDeliveryWindow({
      profile: newYorkProfile,
      runDate: "2026-04-03",
      dispatchTimestamp: "2026-04-03T01:00:00.000Z",
    });

    expect(assessment.due).toBe(false);
    expect(assessment.localDate).toBe("2026-04-02");
  });

  test("treats missed local windows as overdue so the next batch can still send", () => {
    const newYorkProfile = buildProfile({
      countryCode: "US",
      deliveryTimeZone: "America/New_York",
      preferredDeliveryLocalTime: "09:00",
    });
    const assessment = assessProfileDeliveryWindow({
      profile: newYorkProfile,
      runDate: "2026-04-03",
      dispatchTimestamp: "2026-04-04T14:00:00.000Z",
    });

    expect(assessment.overdue).toBe(true);
    expect(assessment.due).toBe(true);
  });

  test("splits due and pending profiles for a scheduler wave", () => {
    const split = splitProfilesByDeliveryWindow({
      profiles: [
        buildProfile(),
        buildProfile({
          id: "parent-2",
          email: "us@example.com",
          countryCode: "US",
          deliveryTimeZone: "America/New_York",
        }),
      ],
      runDate: "2026-04-03",
      dispatchTimestamp: "2026-04-03T01:00:00.000Z",
    });

    expect(split.dueProfiles).toHaveLength(1);
    expect(split.pendingProfiles).toHaveLength(1);
  });

  test("builds a human-readable local delivery window label", () => {
    expect(
      buildProfileLocalDeliveryWindowLabel(
        buildProfile({
          countryCode: "US",
          deliveryTimeZone: "America/Los_Angeles",
          preferredDeliveryLocalTime: "18:30",
        }),
      ),
    ).toBe("6:30 PM · America/Los Angeles");
  });
});
