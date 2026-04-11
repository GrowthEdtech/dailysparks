import { describe, expect, test } from "vitest";

import { mapStripeSubscriptionStatus } from "./stripe-subscription-status";

describe("stripe subscription status mapping", () => {
  test("keeps active and trialing subscriptions billable", () => {
    expect(mapStripeSubscriptionStatus("active")).toBe("active");
    expect(mapStripeSubscriptionStatus("trialing")).toBe("trial");
  });

  test("collapses non-paying Stripe states into canceled access", () => {
    expect(mapStripeSubscriptionStatus("past_due")).toBe("canceled");
    expect(mapStripeSubscriptionStatus("incomplete")).toBe("canceled");
    expect(mapStripeSubscriptionStatus("paused")).toBe("canceled");
    expect(mapStripeSubscriptionStatus("unpaid")).toBe("canceled");
    expect(mapStripeSubscriptionStatus("incomplete_expired")).toBe("canceled");
    expect(mapStripeSubscriptionStatus("canceled")).toBe("canceled");
  });
});
