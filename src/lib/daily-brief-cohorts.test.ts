import { describe, expect, test } from "vitest";

import {
  DAILY_BRIEF_EDITORIAL_COHORTS,
  getEditorialCohortForProfile,
  getEditorialCohortForTimeZone,
  getEditorialCohortFromUtcOffsetMinutes,
} from "./daily-brief-cohorts";
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

describe("daily brief editorial cohorts", () => {
  test("exposes the supported cohort order", () => {
    expect(DAILY_BRIEF_EDITORIAL_COHORTS).toEqual(["APAC", "EMEA", "AMER"]);
  });

  test("maps UTC offsets into APAC, EMEA, and AMER cohorts", () => {
    expect(getEditorialCohortFromUtcOffsetMinutes(8 * 60)).toBe("APAC");
    expect(getEditorialCohortFromUtcOffsetMinutes(1 * 60)).toBe("EMEA");
    expect(getEditorialCohortFromUtcOffsetMinutes(-4 * 60)).toBe("AMER");
  });

  test("maps time zones into the correct cohort using the evaluation date", () => {
    const evaluationDate = new Date("2026-04-04T00:00:00.000Z");

    expect(
      getEditorialCohortForTimeZone("Asia/Tokyo", evaluationDate),
    ).toBe("APAC");
    expect(
      getEditorialCohortForTimeZone("Europe/London", evaluationDate),
    ).toBe("EMEA");
    expect(
      getEditorialCohortForTimeZone("America/New_York", evaluationDate),
    ).toBe("AMER");
  });

  test("derives the editorial cohort from a parent profile timezone", () => {
    expect(
      getEditorialCohortForProfile(
        buildProfile({
          countryCode: "GB",
          deliveryTimeZone: "Europe/London",
        }),
        new Date("2026-04-04T00:00:00.000Z"),
      ),
    ).toBe("EMEA");
  });
});
