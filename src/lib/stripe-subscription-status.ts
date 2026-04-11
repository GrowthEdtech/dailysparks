import type Stripe from "stripe";

import type { SubscriptionStatus } from "./mvp-types";

export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status,
): SubscriptionStatus | null {
  if (status === "active") {
    return "active";
  }

  if (status === "trialing") {
    return "trial";
  }

  if (
    status === "canceled" ||
    status === "unpaid" ||
    status === "incomplete_expired" ||
    status === "past_due" ||
    status === "incomplete" ||
    status === "paused"
  ) {
    return "canceled";
  }

  return null;
}
