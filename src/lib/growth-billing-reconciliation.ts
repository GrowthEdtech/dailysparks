import type { ParentProfile } from "./mvp-types";
import { backfillStripeBillingForProfile } from "./stripe-backfill";
import { getStripeServerClient, isStripeConfigured } from "./stripe";

export type GrowthBillingBackfillResult = {
  profiles: ParentProfile[];
  checkedCount: number;
  backfilledCount: number;
  skippedCount: number;
  failedCount: number;
};

function hasStripeBillingReference(profile: ParentProfile) {
  return Boolean(
    profile.parent.stripeCustomerId?.trim() ||
      profile.parent.stripeSubscriptionId?.trim(),
  );
}

export async function reconcileBillingBackfillForProfiles(input: {
  profiles: ParentProfile[];
}): Promise<GrowthBillingBackfillResult> {
  if (!isStripeConfigured()) {
    return {
      profiles: input.profiles,
      checkedCount: 0,
      backfilledCount: 0,
      skippedCount: 0,
      failedCount: 0,
    };
  }

  const stripe = getStripeServerClient();
  const updatedProfiles = [...input.profiles];
  let checkedCount = 0;
  let backfilledCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const [index, profile] of input.profiles.entries()) {
    if (!hasStripeBillingReference(profile)) {
      continue;
    }

    checkedCount += 1;

    try {
      const backfill = await backfillStripeBillingForProfile(profile, { stripe });

      if (backfill.updatedProfile) {
        updatedProfiles[index] = backfill.updatedProfile;
        backfilledCount += 1;
      } else {
        skippedCount += 1;
      }
    } catch {
      failedCount += 1;
    }
  }

  return {
    profiles: updatedProfiles,
    checkedCount,
    backfilledCount,
    skippedCount,
    failedCount,
  };
}
