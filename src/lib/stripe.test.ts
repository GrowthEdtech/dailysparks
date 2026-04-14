import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const {
  customersRetrieveMock,
  customersCreateMock,
  pricesListMock,
  checkoutCreateMock,
} = vi.hoisted(() => ({
  customersRetrieveMock: vi.fn(),
  customersCreateMock: vi.fn(),
  pricesListMock: vi.fn(),
  checkoutCreateMock: vi.fn(),
}));

vi.mock("stripe", () => {
  class StripeMock {
    customers = {
      retrieve: customersRetrieveMock,
      create: customersCreateMock,
    };

    prices = {
      list: pricesListMock,
    };

    checkout = {
      sessions: {
        create: checkoutCreateMock,
      },
    };
  }

  return {
    default: StripeMock,
  };
});

describe("createCheckoutSessionForParent", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_live_test";
    customersRetrieveMock.mockReset();
    customersCreateMock.mockReset();
    pricesListMock.mockReset();
    checkoutCreateMock.mockReset();
    pricesListMock.mockResolvedValue({
      data: [
        {
          id: "price_yearly_live",
          lookup_key: "daily_sparks_yearly",
          product: "prod_live",
          recurring: {
            interval: "year",
          },
        },
      ],
    });
    checkoutCreateMock.mockResolvedValue({
      id: "cs_live_123",
      url: "https://checkout.stripe.com/pay/cs_live_123",
    });
  });

  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
  });

  test("recreates the Stripe customer when the persisted customer id is missing in the current Stripe mode", async () => {
    customersRetrieveMock.mockRejectedValue({
      code: "resource_missing",
      param: "customer",
    });
    customersCreateMock.mockResolvedValue({
      id: "cus_live_new",
    });

    const { createCheckoutSessionForParent } = await import("./stripe");

    const result = await createCheckoutSessionForParent({
      origin: "https://dailysparks.geledtech.com",
      pricingMarket: "intl",
      subscriptionPlan: "yearly",
      profile: {
        parent: {
          id: "parent-1",
          email: "ckx.leung@gmail.com",
          fullName: "CKX",
          countryCode: "HK",
          deliveryTimeZone: "Asia/Hong_Kong",
          preferredDeliveryLocalTime: "06:30",
          onboardingReminderCount: 0,
          onboardingReminderLastAttemptAt: null,
          onboardingReminderLastSentAt: null,
          onboardingReminderLastStage: null,
          onboardingReminderLastStatus: null,
          onboardingReminderLastMessageId: null,
          onboardingReminderLastError: null,
          subscriptionStatus: "trial",
          subscriptionPlan: "yearly",
          stripeCustomerId: "cus_test_stale",
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
          id: "student-1",
          parentId: "parent-1",
          studentName: "Student",
          programme: "DP",
          programmeYear: 1,
          goodnotesEmail: "",
          goodnotesConnected: false,
          goodnotesVerifiedAt: null,
          goodnotesLastTestSentAt: null,
          goodnotesLastDeliveryStatus: null,
          goodnotesLastDeliveryMessage: null,
          notionConnected: false,
          createdAt: "2026-04-01T00:00:00.000Z",
          updatedAt: "2026-04-01T00:00:00.000Z",
        },
      },
    });

    expect(customersRetrieveMock).toHaveBeenCalledWith("cus_test_stale");
    expect(customersCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ckx.leung@gmail.com",
      }),
    );
    expect(checkoutCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_live_new",
      }),
    );
    expect(result.stripeCustomerId).toBe("cus_live_new");
    expect(result.url).toContain("checkout.stripe.com");
  });
});
