export const MARKETING_ATTRIBUTION_SOURCES = [
  "starter-kit",
  "referral",
  "direct",
] as const;

export type MarketingAttributionSource =
  (typeof MARKETING_ATTRIBUTION_SOURCES)[number];

export const MARKETING_ATTRIBUTION_SOURCE_LABELS: Record<
  MarketingAttributionSource,
  string
> = {
  "starter-kit": "Starter kit",
  referral: "Referral",
  direct: "Direct",
};

export function isMarketingAttributionSource(
  value: unknown,
): value is MarketingAttributionSource {
  return (
    typeof value === "string" &&
    (MARKETING_ATTRIBUTION_SOURCES as readonly string[]).includes(value)
  );
}

export function normalizeMarketingAttributionSource(
  value: unknown,
): MarketingAttributionSource | null {
  return isMarketingAttributionSource(value) ? value : null;
}
