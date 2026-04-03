import { getDerivedAccessState } from "./access-state";
import type { ParentRecord } from "./mvp-types";

export function hasAutomatedDeliverySubscription(
  parent: Pick<ParentRecord, "subscriptionStatus" | "trialEndsAt">,
  now = new Date(),
) {
  const accessState = getDerivedAccessState(parent, now);

  return accessState === "active" || accessState === "trial_active";
}
