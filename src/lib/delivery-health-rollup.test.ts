import { describe, expect, test } from "vitest";

import { getFamilyDeliveryHealthRollup } from "./delivery-health-rollup";
import type { ParentProfile } from "./mvp-types";

function buildProfile(overrides: Partial<ParentProfile> = {}): ParentProfile {
  return {
    parent: {
      id: "parent-1",
      email: "family@example.com",
      fullName: "Family Example",
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
      ...overrides.parent,
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
      goodnotesLastDeliveryMessage: "Daily brief delivered successfully.",
      notionConnected: false,
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
      ...overrides.student,
    },
  };
}

describe("family delivery health rollup", () => {
  test("marks successful Goodnotes delivery as healthy", () => {
    const result = getFamilyDeliveryHealthRollup(buildProfile());

    expect(result.overall).toBe("healthy");
    expect(result.labels).toContain("Goodnotes healthy");
    expect(result.goodnotes.label).toBe("Goodnotes healthy");
  });

  test("surfaces Goodnotes failures as needs attention", () => {
    const result = getFamilyDeliveryHealthRollup(
      buildProfile({
        student: {
          goodnotesLastDeliveryStatus: "failed",
          goodnotesLastDeliveryMessage: "SMTP relay timeout.",
        },
      }),
    );

    expect(result.overall).toBe("attention");
    expect(result.labels).toContain("Goodnotes needs attention");
    expect(result.goodnotes.label).toBe("Goodnotes needs attention");
  });

  test("combines Goodnotes and Notion health into a family rollup", () => {
    const result = getFamilyDeliveryHealthRollup(
      buildProfile({
        parent: {
          notionWorkspaceId: "workspace-1",
          notionWorkspaceName: "Family Workspace",
          notionBotId: "bot-1",
          notionDatabaseId: "database-1",
          notionDatabaseName: "Daily Sparks",
          notionDataSourceId: "data-source-1",
          notionLastSyncedAt: "2026-04-01T02:00:00.000Z",
          notionLastSyncStatus: "failed",
          notionLastSyncMessage: "Notion API timeout.",
        },
        student: {
          notionConnected: true,
        },
      }),
    );

    expect(result.overall).toBe("attention");
    expect(result.labels).toContain("Goodnotes healthy");
    expect(result.labels).toContain("Notion needs attention");
    expect(result.notion.label).toBe("Notion needs attention");
  });
});
