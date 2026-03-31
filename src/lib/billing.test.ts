import { describe, expect, test } from "vitest";

import type { ParentRecord } from "./mvp-types";
import { getSubscriptionPlanBadgeLabel } from "./billing";

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
    createdAt: "2026-03-31T00:00:00.000Z",
    updatedAt: "2026-03-31T00:00:00.000Z",
    ...overrides,
  };
}

describe("billing plan badge label", () => {
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
