import { describe, expect, test } from "vitest";

import {
  DEFAULT_COUNTRY_CODE,
  DEFAULT_DELIVERY_TIME_ZONE,
  DEFAULT_PREFERRED_DELIVERY_LOCAL_TIME,
  buildDeliveryTimeOptions,
  formatPreferredDeliveryLocalTime,
  getDefaultDeliveryTimeZoneForCountry,
  inferCountryCodeFromBrowser,
  normalizeCountryCode,
  normalizeDeliveryTimeZone,
  normalizePreferredDeliveryLocalTime,
  resolveDeliveryPreferences,
} from "./delivery-locale";

describe("delivery locale helpers", () => {
  test("resolves sane defaults when locale settings are missing", () => {
    expect(resolveDeliveryPreferences({})).toEqual({
      countryCode: DEFAULT_COUNTRY_CODE,
      deliveryTimeZone: DEFAULT_DELIVERY_TIME_ZONE,
      preferredDeliveryLocalTime: DEFAULT_PREFERRED_DELIVERY_LOCAL_TIME,
    });
  });

  test("normalizes supported country codes and falls back for invalid values", () => {
    expect(normalizeCountryCode(" us ")).toBe("US");
    expect(normalizeCountryCode("??")).toBe(DEFAULT_COUNTRY_CODE);
  });

  test("chooses a country default time zone when the provided time zone is invalid", () => {
    expect(
      normalizeDeliveryTimeZone("Mars/Olympus", "US"),
    ).toBe(getDefaultDeliveryTimeZoneForCountry("US"));
  });

  test("normalizes delivery times to 30-minute slots with a stable fallback", () => {
    expect(normalizePreferredDeliveryLocalTime("09:30")).toBe("09:30");
    expect(normalizePreferredDeliveryLocalTime("09:15")).toBe(
      DEFAULT_PREFERRED_DELIVERY_LOCAL_TIME,
    );
  });

  test("builds readable local delivery time labels", () => {
    const options = buildDeliveryTimeOptions();

    expect(options[0]).toEqual({ value: "00:00", label: "12:00 AM" });
    expect(options[19]).toEqual({ value: "09:30", label: "9:30 AM" });
    expect(formatPreferredDeliveryLocalTime("18:00")).toBe("6:00 PM");
  });

  test("infers a supported country from browser region or matching default time zone", () => {
    expect(
      inferCountryCodeFromBrowser({
        region: "US",
        timeZone: "America/New_York",
      }),
    ).toBe("US");
    expect(
      inferCountryCodeFromBrowser({
        region: "ZZ",
        timeZone: "Asia/Tokyo",
      }),
    ).toBe("JP");
  });
});
