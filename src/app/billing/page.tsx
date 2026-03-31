import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import BillingForm from "./billing-form";
import { getProfileByEmail } from "../../lib/mvp-store";
import {
  getPricingMarketFromCookieStore,
  PRICING_COUNTRY_HEADER_NAME,
  resolvePricingMarket,
} from "../../lib/pricing-market";
import { getSessionFromCookieStore } from "../../lib/session";

export default async function BillingPage() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const session = await getSessionFromCookieStore(cookieStore);
  const sessionEmail = session?.email ?? null;

  if (!sessionEmail) {
    redirect("/login");
  }

  const profile = await getProfileByEmail(sessionEmail);

  if (!profile) {
    redirect("/login");
  }

  const initialPricingMarket = resolvePricingMarket({
    marketOverride: getPricingMarketFromCookieStore(cookieStore),
    countryCode: headerStore.get(PRICING_COUNTRY_HEADER_NAME),
  });

  return (
    <BillingForm
      initialProfile={profile}
      initialPricingMarket={initialPricingMarket}
    />
  );
}
