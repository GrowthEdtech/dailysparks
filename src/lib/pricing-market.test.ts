import { describe, expect, test } from "vitest";

import {
  DEFAULT_PRICING_MARKET,
  getPricingForPlan,
  resolvePricingMarket,
} from "./pricing-market";

describe("pricing market resolution", () => {
  test("always resolves to the single USD pricing market", () => {
    expect(
      resolvePricingMarket({
        marketOverride: "hk",
        countryCode: "HK",
      }),
    ).toBe(DEFAULT_PRICING_MARKET);
  });
});

describe("plan pricing", () => {
  test("returns the international monthly price in USD", () => {
    expect(getPricingForPlan("monthly", "intl")).toMatchObject({
      currency: "usd",
      amount: 399,
      displayPrice: "USD 3.99",
    });
  });

  test("returns the yearly price in USD", () => {
    expect(getPricingForPlan("yearly", "intl")).toMatchObject({
      currency: "usd",
      amount: 3999,
      displayPrice: "USD 39.99",
    });
  });
});
