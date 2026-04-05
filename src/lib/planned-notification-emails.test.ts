import { describe, expect, test } from "vitest";

import type { ParentProfile } from "./mvp-types";
import {
  buildBillingStatusUpdateEmail,
  buildDeliverySupportAlertEmail,
  buildTrialEndingReminderEmail,
} from "./planned-notification-emails";

function buildProfile(
  overrides: {
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
      subscriptionPlan: "monthly",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      trialStartedAt: "2026-04-01T00:00:00.000Z",
      trialEndsAt: "2026-04-08T00:00:00.000Z",
      subscriptionActivatedAt: null,
      subscriptionRenewalAt: "2026-05-08T00:00:00.000Z",
      latestInvoiceId: "in_123",
      latestInvoiceNumber: "INV-123",
      latestInvoiceStatus: "paid",
      latestInvoiceHostedUrl: "https://invoice.example.com",
      latestInvoicePdfUrl: "https://invoice.example.com/pdf",
      latestInvoiceAmountPaid: 1800,
      latestInvoiceCurrency: "usd",
      latestInvoicePaidAt: "2026-04-05T01:00:00.000Z",
      latestInvoicePeriodStart: "2026-04-05T00:00:00.000Z",
      latestInvoicePeriodEnd: "2026-05-05T00:00:00.000Z",
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

describe("planned notification emails", () => {
  test("builds a trial ending reminder with billing CTA", () => {
    const email = buildTrialEndingReminderEmail({
      profile: buildProfile(),
      appBaseUrl: "https://dailysparks.geledtech.com",
    });

    expect(email.subject).toMatch(/trial ends soon/i);
    expect(email.html).toContain("Your trial is close to ending");
    expect(email.html).toContain("Choose billing before");
    expect(email.html).toContain("Review billing");
    expect(email.text).toContain("Review billing: https://dailysparks.geledtech.com/billing");
  });

  test("builds a paid billing status update with invoice context", () => {
    const email = buildBillingStatusUpdateEmail({
      profile: buildProfile(),
      invoiceStatus: "paid",
      appBaseUrl: "https://dailysparks.geledtech.com",
    });

    expect(email.subject).toMatch(/payment confirmed/i);
    expect(email.html).toContain("Your payment is confirmed");
    expect(email.html).toContain("INV-123");
    expect(email.text).toContain("View invoice: https://invoice.example.com");
  });

  test("builds a delivery support alert with dashboard CTA", () => {
    const email = buildDeliverySupportAlertEmail({
      profile: buildProfile(),
      reason:
        "Active access is live, but no dispatchable Goodnotes or Notion channel is ready yet.",
      appBaseUrl: "https://dailysparks.geledtech.com",
    });

    expect(email.subject).toMatch(/delivery setup/i);
    expect(email.html).toContain("Your delivery setup needs attention");
    expect(email.html).toContain("Review delivery setup");
    expect(email.text).toContain("Review delivery setup: https://dailysparks.geledtech.com/dashboard");
  });
});

