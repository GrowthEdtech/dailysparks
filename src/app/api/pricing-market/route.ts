import {
  DEFAULT_PRICING_MARKET,
  createPricingMarketCookieHeader,
} from "../../../lib/pricing-market";

export async function PUT(request: Request) {
  await request.json().catch(() => null);

  return Response.json(
    { pricingMarket: DEFAULT_PRICING_MARKET },
    {
      headers: {
        "Set-Cookie": createPricingMarketCookieHeader(DEFAULT_PRICING_MARKET),
      },
    },
  );
}
