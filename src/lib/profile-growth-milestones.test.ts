import { describe, expect, test } from "vitest";

import {
  applyAutomaticGrowthMilestones,
  applySetOnceGrowthMilestones,
} from "./profile-growth-milestones";
import type { ParentRecord, StudentRecord } from "./mvp-types";

function buildParent(overrides: Partial<ParentRecord> = {}): ParentRecord {
  return {
    id: "parent-1",
    email: "parent@example.com",
    fullName: "Parent Example",
    countryCode: "HK",
    deliveryTimeZone: "Asia/Hong_Kong",
    preferredDeliveryLocalTime: "09:00",
    firstAuthenticatedAt: "2026-04-01T00:00:00.000Z",
    childProfileCompletedAt: null,
    firstDispatchableChannelAt: null,
    firstBriefDeliveredAt: null,
    firstPaidAt: null,
    onboardingReminderCount: 0,
    onboardingReminderLastAttemptAt: null,
    onboardingReminderLastSentAt: null,
    onboardingReminderLastStage: null,
    onboardingReminderLastStatus: null,
    onboardingReminderLastMessageId: null,
    onboardingReminderLastError: null,
    subscriptionStatus: "trial",
    subscriptionPlan: null,
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
    ...overrides,
  };
}

function buildStudent(overrides: Partial<StudentRecord> = {}): StudentRecord {
  return {
    id: "student-1",
    parentId: "parent-1",
    studentName: "Student",
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
    ...overrides,
  };
}

describe("profile growth milestones", () => {
  test("records child profile completion the first time a meaningful student name exists", () => {
    const result = applyAutomaticGrowthMilestones({
      parent: buildParent(),
      student: buildStudent({ studentName: "Katherine" }),
      now: "2026-04-01T00:15:00.000Z",
    });

    expect(result.parent.childProfileCompletedAt).toBe("2026-04-01T00:15:00.000Z");
  });

  test("records first dispatchable channel when Goodnotes becomes healthy", () => {
    const result = applyAutomaticGrowthMilestones({
      parent: buildParent(),
      student: buildStudent({
        studentName: "Katherine",
        goodnotesEmail: "katherine@goodnotes.email",
        goodnotesConnected: true,
        goodnotesLastDeliveryStatus: "success",
      }),
      now: "2026-04-01T00:20:00.000Z",
    });

    expect(result.parent.firstDispatchableChannelAt).toBe(
      "2026-04-01T00:20:00.000Z",
    );
  });

  test("records first paid at from the first active subscription signal", () => {
    const result = applyAutomaticGrowthMilestones({
      parent: buildParent({
        subscriptionStatus: "active",
        subscriptionActivatedAt: "2026-04-01T02:00:00.000Z",
      }),
      student: buildStudent(),
      now: "2026-04-01T02:00:00.000Z",
    });

    expect(result.parent.firstPaidAt).toBe("2026-04-01T02:00:00.000Z");
  });

  test("never overwrites an existing first milestone", () => {
    const result = applySetOnceGrowthMilestones(
      buildParent({
        firstBriefDeliveredAt: "2026-04-01T09:00:00.000Z",
      }),
      {
        firstBriefDeliveredAt: "2026-04-02T09:00:00.000Z",
      },
    );

    expect(result.parent.firstBriefDeliveredAt).toBe(
      "2026-04-01T09:00:00.000Z",
    );
  });
});
