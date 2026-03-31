import { describe, expect, test } from "vitest";

import {
  getPricingForPlan,
  getPricingMarketToggleCaption,
  getPricingMarketToggleTitle,
  resolvePricingMarket,
} from "./pricing-market";

describe("pricing market resolution", () => {
  test("uses the explicit override before geolocation", () => {
    expect(
      resolvePricingMarket({
        marketOverride: "intl",
        countryCode: "HK",
      }),
    ).toBe("intl");
  });

  test("maps Hong Kong traffic to the HK pricing market", () => {
    expect(
      resolvePricingMarket({
        marketOverride: null,
        countryCode: "HK",
      }),
    ).toBe("hk");
  });

  test("falls back to international pricing outside Hong Kong", () => {
    expect(
      resolvePricingMarket({
        marketOverride: null,
        countryCode: "US",
      }),
    ).toBe("intl");
  });
});

describe("plan pricing", () => {
  test("returns the Hong Kong yearly price in HKD", () => {
    expect(getPricingForPlan("yearly", "hk")).toMatchObject({
      currency: "hkd",
      amount: 29999,
      displayPrice: "HK$299.99",
    });
  });

  test("returns the international monthly price in USD", () => {
    expect(getPricingForPlan("monthly", "intl")).toMatchObject({
      currency: "usd",
      amount: 399,
      displayPrice: "USD 3.99",
    });
  });
});

describe("pricing market toggle labels", () => {
  test("uses a short title for the Hong Kong option", () => {
    expect(getPricingMarketToggleTitle("hk")).toBe("Hong Kong");
    expect(getPricingMarketToggleCaption("hk")).toBe("HKD pricing");
  });

  test("uses a short title for the international option", () => {
    expect(getPricingMarketToggleTitle("intl")).toBe("International");
    expect(getPricingMarketToggleCaption("intl")).toBe("USD pricing");
  });
});
