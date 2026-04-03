import { describe, expect, test } from "vitest";

import type { ParentProfile } from "./mvp-types";
import {
  getDeliveryChannelReadiness,
  getGoodnotesChannelReadiness,
  getNotionChannelReadiness,
  hasDispatchableDeliveryChannel,
} from "./delivery-readiness";

function buildProfile(overrides: Partial<ParentProfile> = {}): ParentProfile {
  return {
    parent: {
      id: "parent-1",
      email: "family@example.com",
      fullName: "Family Example",
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
      ...(overrides.parent ?? {}),
    },
    student: {
      id: "student-1",
      parentId: "parent-1",
      studentName: "Student",
      programme: "PYP",
      programmeYear: 5,
      goodnotesEmail: "student@goodnotes.email",
      goodnotesConnected: true,
      goodnotesVerifiedAt: "2026-04-01T00:00:00.000Z",
      goodnotesLastTestSentAt: "2026-04-01T00:00:00.000Z",
      goodnotesLastDeliveryStatus: "success",
      goodnotesLastDeliveryMessage: "Goodnotes ready.",
      notionConnected: false,
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
      ...(overrides.student ?? {}),
    },
  };
}

describe("delivery-readiness", () => {
  test("treats a successful Goodnotes setup as dispatchable", () => {
    const readiness = getGoodnotesChannelReadiness(buildProfile());

    expect(readiness.configured).toBe(true);
    expect(readiness.verified).toBe(true);
    expect(readiness.healthy).toBe(true);
    expect(readiness.dispatchable).toBe(true);
    expect(readiness.retryable).toBe(true);
    expect(readiness.stage).toBe("healthy");
  });

  test("keeps failed Goodnotes channels retryable but not dispatchable", () => {
    const readiness = getGoodnotesChannelReadiness(
      buildProfile({
        student: {
          goodnotesLastDeliveryStatus: "failed",
          goodnotesLastDeliveryMessage: "SMTP relay timeout.",
        },
      }),
    );

    expect(readiness.verified).toBe(true);
    expect(readiness.healthy).toBe(false);
    expect(readiness.dispatchable).toBe(false);
    expect(readiness.retryable).toBe(true);
    expect(readiness.needsAttention).toBe(true);
    expect(readiness.stage).toBe("attention");
  });

  test("treats a Notion archive with only idle sync status as verified but not dispatchable", () => {
    const readiness = getNotionChannelReadiness(
      buildProfile({
        parent: {
          notionWorkspaceId: "workspace-1",
          notionDatabaseId: "db-1",
          notionDataSourceId: "data-source-1",
          notionLastSyncStatus: "idle",
        },
        student: {
          notionConnected: true,
        },
      }),
    );

    expect(readiness.configured).toBe(true);
    expect(readiness.verified).toBe(true);
    expect(readiness.healthy).toBe(false);
    expect(readiness.dispatchable).toBe(false);
    expect(readiness.retryable).toBe(true);
    expect(readiness.stage).toBe("verified");
  });

  test("family dispatchability requires at least one healthy channel", () => {
    const failedChannelsProfile = buildProfile({
      parent: {
        notionWorkspaceId: "workspace-1",
        notionDatabaseId: "db-1",
        notionDataSourceId: "data-source-1",
        notionLastSyncStatus: "failed",
      },
      student: {
        goodnotesLastDeliveryStatus: "failed",
        notionConnected: true,
      },
    });

    expect(
      getDeliveryChannelReadiness(failedChannelsProfile, "goodnotes")
        .dispatchable,
    ).toBe(false);
    expect(
      getDeliveryChannelReadiness(failedChannelsProfile, "notion").dispatchable,
    ).toBe(false);
    expect(hasDispatchableDeliveryChannel(failedChannelsProfile)).toBe(false);
  });
});
