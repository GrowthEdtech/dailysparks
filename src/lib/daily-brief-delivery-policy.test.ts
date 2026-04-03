import { afterEach, describe, expect, test } from "vitest";

import {
  getDailyBriefDispatchMode,
  planDailyBriefDispatch,
} from "./daily-brief-delivery-policy";
import type { ParentProfile } from "./mvp-types";

const ORIGINAL_ENV = { ...process.env };

function buildProfile(email: string): ParentProfile {
  return {
    parent: {
      id: email,
      email,
      fullName: email,
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
    },
    student: {
      id: `student-${email}`,
      parentId: email,
      studentName: "Learner",
      programme: "PYP",
      programmeYear: 5,
      goodnotesEmail: "learner@goodnotes.email",
      goodnotesConnected: true,
      goodnotesVerifiedAt: "2026-04-01T00:00:00.000Z",
      goodnotesLastTestSentAt: null,
      goodnotesLastDeliveryStatus: null,
      goodnotesLastDeliveryMessage: null,
      notionConnected: false,
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
    },
  };
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("daily brief delivery policy", () => {
  test("defaults to all-mode dispatch", () => {
    process.env = {
      ...ORIGINAL_ENV,
    };

    const plan = planDailyBriefDispatch([
      buildProfile("first@example.com"),
      buildProfile("second@example.com"),
    ]);

    expect(getDailyBriefDispatchMode()).toBe("all");
    expect(plan.mode).toBe("all");
    expect(plan.selectedProfiles).toHaveLength(2);
    expect(plan.skippedProfiles).toHaveLength(0);
  });

  test("filters profiles down to canary emails when canary mode is enabled", () => {
    process.env = {
      ...ORIGINAL_ENV,
      DAILY_BRIEF_DELIVERY_MODE: "canary",
      DAILY_BRIEF_CANARY_PARENT_EMAILS:
        "canary@example.com, second-canary@example.com ",
    };

    const plan = planDailyBriefDispatch([
      buildProfile("canary@example.com"),
      buildProfile("general@example.com"),
    ]);

    expect(getDailyBriefDispatchMode()).toBe("canary");
    expect(plan.mode).toBe("canary");
    expect(plan.canaryParentEmails).toEqual([
      "canary@example.com",
      "second-canary@example.com",
    ]);
    expect(plan.selectedProfiles).toHaveLength(1);
    expect(plan.selectedProfiles[0]?.parent.email).toBe("canary@example.com");
    expect(plan.skippedProfiles).toHaveLength(1);
  });
});
