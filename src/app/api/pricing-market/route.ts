import {
  createPricingMarketCookieHeader,
  normalizePricingMarket,
} from "../../../lib/pricing-market";

type UpdatePricingMarketBody = {
  pricingMarket?: unknown;
};

function badRequest(message: string) {
  return Response.json({ message }, { status: 400 });
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as UpdatePricingMarketBody | null;

  if (!body) {
    return badRequest("Please submit a valid request body.");
  }

  const pricingMarket = normalizePricingMarket(
    typeof body.pricingMarket === "string" ? body.pricingMarket : null,
  );

  if (!pricingMarket) {
    return badRequest("Please select either the Hong Kong or international market.");
  }

  return Response.json(
    { pricingMarket },
    {
      headers: {
        "Set-Cookie": createPricingMarketCookieHeader(pricingMarket),
      },
    },
  );
}
