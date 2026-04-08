import { describe, expect, test } from "vitest";

import type { ParentProfile } from "./mvp-types";
import {
  assessOnboardingActivationReminder,
  ONBOARDING_ACTIVATION_REMINDER_STAGES,
} from "./onboarding-activation-reminder";

function buildProfile(
  overrides: Partial<ParentProfile> & {
    parent?: Partial<ParentProfile["parent"]>;
    student?: Partial<ParentProfile["student"]>;
  } = {},
): ParentProfile {
  return {
    parent: {
      id: "parent-1",
      email: "parent@example.com",
      fullName: "Parent Example",
      countryCode: "HK",
      deliveryTimeZone: "Asia/Hong_Kong",
      preferredDeliveryLocalTime: "09:00",
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
      ...overrides.student,
    },
  };
}

describe("onboarding activation reminder policy", () => {
  test("marks a logged-in family with no dispatchable channel as due after the first 24 hour stage opens", () => {
    const assessment = assessOnboardingActivationReminder({
      profile: buildProfile(),
      now: new Date("2026-04-02T01:30:00.000Z"),
    });

    expect(assessment.eligible).toBe(true);
    expect(assessment.due).toBe(true);
    expect(assessment.stage?.index).toBe(1);
    expect(assessment.reason).toMatch(/first activation reminder/i);
  });

  test("waits for the follow-up stage after one successful reminder", () => {
    const assessment = assessOnboardingActivationReminder({
      profile: buildProfile({
        parent: {
          onboardingReminderCount: 1,
          onboardingReminderLastAttemptAt: "2026-04-02T01:00:00.000Z",
          onboardingReminderLastSentAt: "2026-04-02T01:00:05.000Z",
          onboardingReminderLastStage: 1,
          onboardingReminderLastStatus: "sent",
        },
      }),
      now: new Date("2026-04-03T01:30:00.000Z"),
    });

    expect(assessment.eligible).toBe(true);
    expect(assessment.due).toBe(false);
    expect(assessment.stage?.index).toBe(2);
    expect(assessment.reason).toMatch(/not reached/i);
  });

  test("uses first authenticated time instead of record creation time as the reminder anchor", () => {
    const assessment = assessOnboardingActivationReminder({
      profile: buildProfile({
        parent: {
          createdAt: "2026-03-20T00:00:00.000Z",
          firstAuthenticatedAt: "2026-04-01T00:00:00.000Z",
        },
      }),
      now: new Date("2026-04-01T12:00:00.000Z"),
    });

    expect(assessment.eligible).toBe(true);
    expect(assessment.due).toBe(false);
    expect(assessment.stage?.index).toBe(1);
    expect(assessment.reason).toMatch(/elapsed-time gate/i);
  });

  test("allows a failed reminder to retry after a shorter failure cooldown", () => {
    const assessment = assessOnboardingActivationReminder({
      profile: buildProfile({
        parent: {
          onboardingReminderLastAttemptAt: "2026-04-02T01:00:00.000Z",
          onboardingReminderLastStatus: "failed",
          onboardingReminderLastError: "SMTP offline",
        },
      }),
      now: new Date("2026-04-02T03:30:00.000Z"),
    });

    expect(assessment.eligible).toBe(true);
    expect(assessment.due).toBe(true);
    expect(assessment.stage?.index).toBe(1);
  });

  test("excludes families that already have a healthy dispatchable channel", () => {
    const assessment = assessOnboardingActivationReminder({
      profile: buildProfile({
        student: {
          goodnotesEmail: "katherine@goodnotes.email",
          goodnotesConnected: true,
          goodnotesLastDeliveryStatus: "success",
        },
      }),
      now: new Date("2026-04-02T01:30:00.000Z"),
    });

    expect(assessment.eligible).toBe(false);
    expect(assessment.due).toBe(false);
    expect(assessment.reason).toMatch(/already has a dispatchable channel/i);
  });

  test("excludes families whose delivery channel needs attention rather than activation", () => {
    const assessment = assessOnboardingActivationReminder({
      profile: buildProfile({
        student: {
          goodnotesEmail: "katherine@goodnotes.email",
          goodnotesConnected: true,
          goodnotesLastDeliveryStatus: "failed",
        },
      }),
      now: new Date("2026-04-02T01:30:00.000Z"),
    });

    expect(assessment.eligible).toBe(false);
    expect(assessment.reason).toMatch(/needs support/i);
  });

  test("stops after the configured reminder stages are exhausted", () => {
    const assessment = assessOnboardingActivationReminder({
      profile: buildProfile({
        parent: {
          subscriptionStatus: "active",
          onboardingReminderCount: ONBOARDING_ACTIVATION_REMINDER_STAGES.length,
          onboardingReminderLastStage:
            ONBOARDING_ACTIVATION_REMINDER_STAGES.length,
        },
      }),
      now: new Date("2026-04-10T01:30:00.000Z"),
    });

    expect(assessment.eligible).toBe(false);
    expect(assessment.stage).toBeNull();
    expect(assessment.reason).toMatch(/already exhausted/i);
  });
});
