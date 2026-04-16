import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getProfileByEmail } from "../../lib/mvp-store";
import { getSessionFromCookieStore } from "../../lib/session";
import { getActivationFunnelState } from "../../lib/activation-funnel";
import PricingWizard from "./pricing-wizard";
import { resolvePricingMarket } from "../../lib/pricing-market";

export const metadata: Metadata = {
  title: "Pricing | Daily Sparks",
  description: "Introductory 7-day trial for $0.99. Experience the IB reading routine today.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PricingPage() {
  const session = await getSessionFromCookieStore(await cookies());
  const sessionEmail = session?.email ?? null;

  if (!sessionEmail) {
    redirect("/login");
  }

  const profile = await getProfileByEmail(sessionEmail);

  if (!profile) {
    redirect("/login");
  }

  const funnel = getActivationFunnelState(profile);

  // If already paid/activated, skipping pricing and moving to onboarding or dashboard
  if (funnel.steps.paid_activated.completed) {
    if (!funnel.steps.dispatchable_channel_ready.completed) {
      redirect("/onboarding");
    } else {
      redirect("/dashboard");
    }
  }

  return (
    <PricingWizard 
      pricingMarket={resolvePricingMarket()}
    />
  );
}
