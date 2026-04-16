import type { SubscriptionPlan } from "./mvp-types";

export const PRICING_MARKETS = ["intl"] as const;
export type PricingMarket = (typeof PRICING_MARKETS)[number];
export type PricingCurrency = "usd";

export const DEFAULT_PRICING_MARKET: PricingMarket = "intl";
export const PRICING_MARKET_COOKIE_NAME = "daily-sparks-market";

type PlanCadence = "month" | "year";

type PricingPlanConfig = {
  cadence: PlanCadence;
  lookupKey: string;
  productName: string;
  prices: Record<
    PricingMarket,
    {
      amount: number;
      currency: PricingCurrency;
    }
  >;
};

const PRICING_PLAN_CONFIG: Record<Exclude<SubscriptionPlan, null>, PricingPlanConfig> = {
  monthly: {
    cadence: "month",
    lookupKey: "daily_sparks_monthly",
    productName: "Daily Sparks Monthly",
    prices: {
      intl: {
        amount: 399,
        currency: "usd",
      },
    },
  },
  yearly: {
    cadence: "year",
    lookupKey: "daily_sparks_yearly",
    productName: "Daily Sparks Yearly",
    prices: {
      intl: {
        amount: 3999,
        currency: "usd",
      },
    },
  },
};

export const TRIAL_FEE_CONFIG = {
  amount: 99, // $0.99
  currency: "usd" as PricingCurrency,
  lookupKey: "daily_sparks_trial_initiation",
  productName: "7-Day Introductory Trial Access",
};

function formatMoney(amount: number) {
  return `USD ${(amount / 100).toFixed(2)}`;
}

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return null;
  }

  for (const cookie of cookieHeader.split(";")) {
    const [rawName, ...rawValueParts] = cookie.trim().split("=");

    if (rawName === name) {
      return decodeURIComponent(rawValueParts.join("="));
    }
  }

  return null;
}

function serializeCookie(name: string, value: string) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Max-Age=31536000",
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function normalizePricingMarket(
  value: string | null | undefined,
): PricingMarket | null {
  return value ? DEFAULT_PRICING_MARKET : null;
}

export function resolvePricingMarket() {
  return DEFAULT_PRICING_MARKET;
}

export function getPricingMarketFromRequest(request: Request) {
  return (
    normalizePricingMarket(
      getCookieValue(request.headers.get("cookie"), PRICING_MARKET_COOKIE_NAME),
    ) ?? DEFAULT_PRICING_MARKET
  );
}

export function createPricingMarketCookieHeader(pricingMarket: PricingMarket) {
  return serializeCookie(PRICING_MARKET_COOKIE_NAME, pricingMarket);
}

export function getPricingForPlan(
  subscriptionPlan: Exclude<SubscriptionPlan, null>,
  pricingMarket: PricingMarket,
) {
  const plan = PRICING_PLAN_CONFIG[subscriptionPlan];
  const price = plan.prices[pricingMarket];

  return {
    amount: price.amount,
    cadence: plan.cadence === "month" ? "/ month" : "/ year",
    currency: price.currency,
    displayPrice: formatMoney(price.amount),
    interval: plan.cadence,
    lookupKey: plan.lookupKey,
    productName: plan.productName,
  };
}

export function getPricingLookupKeyForPlan(
  subscriptionPlan: Exclude<SubscriptionPlan, null>,
) {
  return PRICING_PLAN_CONFIG[subscriptionPlan].lookupKey;
}

export function getPricingProductNameForPlan(
  subscriptionPlan: Exclude<SubscriptionPlan, null>,
) {
  return PRICING_PLAN_CONFIG[subscriptionPlan].productName;
}

export function getPricingIntervalForPlan(
  subscriptionPlan: Exclude<SubscriptionPlan, null>,
) {
  return PRICING_PLAN_CONFIG[subscriptionPlan].cadence;
}

export function getYearlySavingsCopy(pricingMarket: PricingMarket) {
  const yearlyPrice = getPricingForPlan("yearly", pricingMarket);
  const monthlyPrice = getPricingForPlan("monthly", pricingMarket);
  const yearlyMonthlyEquivalent = yearlyPrice.amount / 12;
  const savings = monthlyPrice.amount * 12 - yearlyPrice.amount;

  return {
    savingsDisplay: formatMoney(savings),
    effectiveMonthlyDisplay: `~USD ${(yearlyMonthlyEquivalent / 100).toFixed(2)} / month`,
  };
}
