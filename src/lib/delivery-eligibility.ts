import type { ParentRecord } from "./mvp-types";

export function hasAutomatedDeliverySubscription(
  parent: Pick<ParentRecord, "subscriptionStatus" | "trialEndsAt">,
  now = new Date(),
) {
  if (parent.subscriptionStatus === "active") {
    return true;
  }

  if (parent.subscriptionStatus !== "trial") {
    return false;
  }

  const trialEndsAt = Date.parse(parent.trialEndsAt);

  if (Number.isNaN(trialEndsAt)) {
    return false;
  }

  return trialEndsAt > now.getTime();
}
