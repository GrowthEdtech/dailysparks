import { describe, expect, test } from "vitest";

import {
  getActivationFunnelState,
  type ActivationFunnelStageKey,
} from "./activation-funnel";
import type { ParentProfile } from "./mvp-types";

function buildProfile(overrides: Partial<ParentProfile> = {}): ParentProfile {
  return {
    parent: {
      id: "parent-1",
      email: "family@example.com",
      fullName: "Family Example",
      countryCode: "HK",
      deliveryTimeZone: "Asia/Hong_Kong",
      preferredDeliveryLocalTime: "09:00",
      firstAuthenticatedAt: "2026-04-01T00:00:00.000Z",
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
      ...overrides.parent,
    },
    student: {
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
      ...overrides.student,
    },
  };
}

function expectStage(
  profile: ParentProfile,
  stage: ActivationFunnelStageKey,
  nextStage: ActivationFunnelStageKey | null,
) {
  const result = getActivationFunnelState(profile);

  expect(result.currentStage).toBe(stage);
  expect(result.nextStage).toBe(nextStage);

  return result;
}

describe("activation funnel", () => {
  test("starts at signed_in for a fresh family", () => {
    const result = expectStage(
      buildProfile(),
      "signed_in",
      "child_profile_completed",
    );

    expect(result.steps.signed_in.completed).toBe(true);
    expect(result.steps.signed_in.completedAt).toBe(
      "2026-04-01T00:00:00.000Z",
    );
    expect(result.steps.child_profile_completed.completed).toBe(false);
  });

  test("advances to child profile completed once the milestone is recorded", () => {
    const result = expectStage(
      buildProfile({
        parent: {
          childProfileCompletedAt: "2026-04-01T00:15:00.000Z",
        },
        student: {
          studentName: "Katherine",
        },
      }),
      "child_profile_completed",
      "dispatchable_channel_ready",
    );

    expect(result.steps.child_profile_completed.completed).toBe(true);
    expect(result.steps.child_profile_completed.completedAt).toBe(
      "2026-04-01T00:15:00.000Z",
    );
  });

  test("treats a healthy channel as dispatchable even for legacy families missing the timestamp", () => {
    const result = expectStage(
      buildProfile({
        parent: {
          childProfileCompletedAt: "2026-04-01T00:15:00.000Z",
        },
        student: {
          studentName: "Katherine",
          goodnotesEmail: "katherine@goodnotes.email",
          goodnotesConnected: true,
          goodnotesLastDeliveryStatus: "success",
        },
      }),
      "dispatchable_channel_ready",
      "first_brief_delivered",
    );

    expect(result.steps.dispatchable_channel_ready.completed).toBe(true);
    expect(result.steps.dispatchable_channel_ready.completedAt).toBeNull();
    expect(result.steps.dispatchable_channel_ready.derived).toBe(true);
  });

  test("advances to first brief delivered once the first delivery milestone exists", () => {
    const result = expectStage(
      buildProfile({
        parent: {
          childProfileCompletedAt: "2026-04-01T00:15:00.000Z",
          firstDispatchableChannelAt: "2026-04-01T00:20:00.000Z",
          firstBriefDeliveredAt: "2026-04-01T01:00:00.000Z",
        },
        student: {
          studentName: "Katherine",
        },
      }),
      "first_brief_delivered",
      "paid_activated",
    );

    expect(result.steps.first_brief_delivered.completedAt).toBe(
      "2026-04-01T01:00:00.000Z",
    );
  });

  test("marks a paid family as paid activated even when the explicit paid milestone is still legacy", () => {
    const result = expectStage(
      buildProfile({
        parent: {
          childProfileCompletedAt: "2026-04-01T00:15:00.000Z",
          firstDispatchableChannelAt: "2026-04-01T00:20:00.000Z",
          firstBriefDeliveredAt: "2026-04-01T01:00:00.000Z",
          subscriptionStatus: "active",
          subscriptionActivatedAt: "2026-04-01T02:00:00.000Z",
        },
        student: {
          studentName: "Katherine",
        },
      }),
      "paid_activated",
      null,
    );

    expect(result.steps.paid_activated.completed).toBe(true);
    expect(result.steps.paid_activated.completedAt).toBe(
      "2026-04-01T02:00:00.000Z",
    );
    expect(result.steps.paid_activated.derived).toBe(true);
  });
});
