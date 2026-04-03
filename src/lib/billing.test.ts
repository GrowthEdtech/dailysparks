import { describe, expect, test } from "vitest";

import type { ParentRecord } from "./mvp-types";
import {
  getBillingPlanDefinitions,
  getBillingSummary,
  getLatestInvoiceSummary,
  getSubscriptionPlanBadgeLabel,
} from "./billing";

function createParentRecord(overrides: Partial<ParentRecord> = {}): ParentRecord {
  return {
    id: "parent-1",
    email: "parent@example.com",
    fullName: "Parent Example",
    subscriptionStatus: "trial",
    subscriptionPlan: "yearly",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    trialStartedAt: "2026-03-31T00:00:00.000Z",
    trialEndsAt: "2026-04-07T00:00:00.000Z",
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
    createdAt: "2026-03-31T00:00:00.000Z",
    updatedAt: "2026-03-31T00:00:00.000Z",
    ...overrides,
  };
}

describe("billing plan badge label", () => {
  test("exposes the current USD subscription pricing", () => {
    expect(getBillingPlanDefinitions("intl")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "monthly",
          price: "USD 3.99",
          cadence: "/ month",
        }),
        expect.objectContaining({
          id: "yearly",
          price: "USD 39.99",
          cadence: "/ year",
        }),
      ]),
    );
  });

  test("hides the chosen-plan badge once subscription is active", () => {
    const parent = createParentRecord({
      subscriptionStatus: "active",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      subscriptionActivatedAt: "2026-03-31T00:00:00.000Z",
    });

    expect(getSubscriptionPlanBadgeLabel(parent)).toBeNull();
  });

  test("shows chosen-plan badge while subscription is still pending activation", () => {
    const parent = createParentRecord({
      subscriptionStatus: "trial",
      subscriptionPlan: "monthly",
    });

    expect(getSubscriptionPlanBadgeLabel(parent)).toBe("Monthly chosen");
  });
});

describe("latest invoice summary", () => {
  test("returns null when no Stripe invoice has been recorded yet", () => {
    const parent = createParentRecord();

    expect(getLatestInvoiceSummary(parent)).toBeNull();
  });

  test("formats the latest paid Stripe invoice for billing UI", () => {
    const parent = createParentRecord({
      subscriptionStatus: "active",
      subscriptionPlan: "yearly",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      subscriptionActivatedAt: "2026-03-31T00:00:00.000Z",
      subscriptionRenewalAt: "2027-03-31T00:00:00.000Z",
      latestInvoiceId: "in_123",
      latestInvoiceNumber: "DS-2026-0001",
      latestInvoiceStatus: "paid",
      latestInvoiceHostedUrl: "https://invoice.stripe.com/i/in_123",
      latestInvoicePdfUrl: "https://pay.stripe.com/invoice/in_123/pdf",
      latestInvoiceAmountPaid: 3999,
      latestInvoiceCurrency: "usd",
      latestInvoicePaidAt: "2026-03-31T00:10:00.000Z",
      latestInvoicePeriodStart: "2026-03-31T00:00:00.000Z",
      latestInvoicePeriodEnd: "2027-03-31T00:00:00.000Z",
    });

    const summary = getLatestInvoiceSummary(parent);

    expect(summary).not.toBeNull();
    expect(summary?.title).toBe("Latest invoice");
    expect(summary?.statusLabel).toBe("Paid");
    expect(summary?.recipientEmail).toBe("parent@example.com");
    expect(summary?.hostedInvoiceUrl).toBe("https://invoice.stripe.com/i/in_123");
    expect(summary?.invoicePdfUrl).toBe("https://pay.stripe.com/invoice/in_123/pdf");
    expect(summary?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Invoice number",
          value: "DS-2026-0001",
        }),
        expect.objectContaining({
          label: "Amount paid",
          value: "$39.99",
        }),
        expect.objectContaining({
          label: "Sent to",
          value: "parent@example.com",
        }),
      ]),
    );
  });
});

describe("billing summary", () => {
  test("shows an expired-trial summary once the trial has passed", () => {
    const parent = createParentRecord({
      subscriptionStatus: "trial",
      subscriptionPlan: null,
      trialEndsAt: "2026-04-02T00:00:00.000Z",
    });

    const summary = getBillingSummary(parent, new Date("2026-04-03T00:00:00.000Z"));

    expect(summary.title).toBe("Trial expired");
    expect(summary.statusLabel).toBe("Trial expired");
    expect(summary.detail).toMatch(/resume/i);
  });
});
