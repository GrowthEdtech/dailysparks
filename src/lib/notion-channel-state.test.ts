import { describe, expect, test } from "vitest";

import type { ParentProfile } from "./mvp-types";
import { getNotionChannelState } from "./notion-channel-state";

function createProfile(overrides: Partial<ParentProfile> = {}): ParentProfile {
  return {
    parent: {
      id: "parent-1",
      email: "parent@example.com",
      fullName: "Parent Example",
      subscriptionStatus: "active",
      subscriptionPlan: "monthly",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      trialStartedAt: "2026-04-01T00:00:00.000Z",
      trialEndsAt: "2026-04-08T00:00:00.000Z",
      subscriptionActivatedAt: null,
      subscriptionRenewalAt: null,
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
      studentName: "Katherine",
      programme: "PYP",
      programmeYear: 5,
      goodnotesEmail: "",
      goodnotesConnected: false,
      goodnotesVerifiedAt: null,
      goodnotesLastTestSentAt: null,
      goodnotesLastDeliveryStatus: null,
      goodnotesLastDeliveryMessage: null,
      notionConnected: false,
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
      ...(overrides.student ?? {}),
    },
  };
}

describe("notion-channel-state", () => {
  test("treats an archive without a successful sync as configured but not verified", () => {
    const state = getNotionChannelState(
      createProfile({
        parent: {
          notionWorkspaceId: "workspace-1",
          notionDatabaseId: "db-1",
          notionDataSourceId: "data-source-1",
          notionLastSyncStatus: "idle",
        },
      }),
    );

    expect(state.configured).toBe(true);
    expect(state.verified).toBe(false);
    expect(state.healthy).toBe(false);
  });

  test("treats a successful sync as verified and healthy", () => {
    const state = getNotionChannelState(
      createProfile({
        parent: {
          notionWorkspaceId: "workspace-1",
          notionDatabaseId: "db-1",
          notionDataSourceId: "data-source-1",
          notionLastSyncStatus: "success",
        },
        student: {
          notionConnected: true,
        },
      }),
    );

    expect(state.configured).toBe(true);
    expect(state.verified).toBe(true);
    expect(state.healthy).toBe(true);
  });
});
