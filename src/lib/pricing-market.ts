import type { SubscriptionPlan } from "./mvp-types";

export const PRICING_MARKETS = ["hk", "intl"] as const;
export type PricingMarket = (typeof PRICING_MARKETS)[number];
export type PricingCurrency = "hkd" | "usd";

export const DEFAULT_PRICING_MARKET: PricingMarket = "intl";
export const PRICING_MARKET_COOKIE_NAME = "daily-sparks-market";
export const PRICING_COUNTRY_HEADER_NAME = "x-client-country";

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
      hk: {
        amount: 2999,
        currency: "hkd",
      },
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
      hk: {
        amount: 29999,
        currency: "hkd",
      },
      intl: {
        amount: 3999,
        currency: "usd",
      },
    },
  },
};

type ResolvePricingMarketInput = {
  marketOverride: string | null | undefined;
  countryCode: string | null | undefined;
};

function formatMoney(amount: number, currency: PricingCurrency) {
  const value = (amount / 100).toFixed(2);

  if (currency === "hkd") {
    return `HK$${value}`;
  }

  return `USD ${value}`;
}

function getFirstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() ?? "";
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
  const parts = [`${name}=${encodeURIComponent(value)}`, "Max-Age=31536000", "Path=/", "HttpOnly", "SameSite=Lax"];

  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function normalizePricingMarket(
  value: string | null | undefined,
): PricingMarket | null {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === "hk" || normalizedValue === "intl") {
    return normalizedValue;
  }

  return null;
}

export function resolvePricingMarket({
  marketOverride,
  countryCode,
}: ResolvePricingMarketInput): PricingMarket {
  const normalizedOverride = normalizePricingMarket(marketOverride);

  if (normalizedOverride) {
    return normalizedOverride;
  }

  return getFirstHeaderValue(countryCode ?? null).toUpperCase() === "HK"
    ? "hk"
    : DEFAULT_PRICING_MARKET;
}

export function getPricingMarketFromCookieStore(cookieStore: {
  get(name: string): { value: string } | undefined;
}) {
  return normalizePricingMarket(cookieStore.get(PRICING_MARKET_COOKIE_NAME)?.value);
}

export function getPricingMarketFromRequest(request: Request) {
  return resolvePricingMarket({
    marketOverride: getCookieValue(
      request.headers.get("cookie"),
      PRICING_MARKET_COOKIE_NAME,
    ),
    countryCode: request.headers.get(PRICING_COUNTRY_HEADER_NAME),
  });
}

export function createPricingMarketCookieHeader(pricingMarket: PricingMarket) {
  return serializeCookie(PRICING_MARKET_COOKIE_NAME, pricingMarket);
}

export function getPricingMarketLabel(pricingMarket: PricingMarket) {
  return pricingMarket === "hk" ? "Hong Kong pricing" : "International pricing";
}

export function getPricingMarketToggleTitle(pricingMarket: PricingMarket) {
  return pricingMarket === "hk" ? "Hong Kong" : "International";
}

export function getPricingMarketToggleCaption(pricingMarket: PricingMarket) {
  return pricingMarket === "hk" ? "HKD pricing" : "USD pricing";
}

export function getPricingMarketSupportCopy(pricingMarket: PricingMarket) {
  return pricingMarket === "hk"
    ? "Checkout and invoices will continue in HKD for this market."
    : "Checkout and invoices will continue in USD for this market.";
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
    displayPrice: formatMoney(price.amount, price.currency),
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
    savingsDisplay: formatMoney(savings, yearlyPrice.currency),
    effectiveMonthlyDisplay:
      yearlyPrice.currency === "hkd"
        ? `~HK$${(yearlyMonthlyEquivalent / 100).toFixed(2)} / month`
        : `~USD ${(yearlyMonthlyEquivalent / 100).toFixed(2)} / month`,
  };
}
