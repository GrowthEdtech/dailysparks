import { getProfileByEmail, updateParentSubscription } from "../../../../lib/mvp-store";
import {
  clearSessionCookieHeader,
  getSessionEmailFromRequest,
} from "../../../../lib/session";
import { isSubscriptionPlan } from "../../../../lib/mvp-types";
import { getPricingMarketFromRequest } from "../../../../lib/pricing-market";
import { getRequestOrigin } from "../../../../lib/request-origin";
import { createCheckoutSessionForParent, isStripeConfigured } from "../../../../lib/stripe";

type CheckoutRequestBody = {
  subscriptionPlan?: unknown;
};

function unauthorized(message: string) {
  return Response.json(
    { message },
    {
      status: 401,
      headers: {
        "Set-Cookie": clearSessionCookieHeader(),
      },
    },
  );
}

function badRequest(message: string) {
  return Response.json({ message }, { status: 400 });
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function POST(request: Request) {
  const sessionEmail = await getSessionEmailFromRequest(request);

  if (!sessionEmail) {
    return unauthorized("Please log in to continue.");
  }

  const body = (await request.json().catch(() => null)) as CheckoutRequestBody | null;

  if (!body) {
    return badRequest("Please submit a valid request body.");
  }

  const subscriptionPlan = normalizeString(body.subscriptionPlan);

  if (!isSubscriptionPlan(subscriptionPlan)) {
    return badRequest("Please select either the monthly or yearly plan.");
  }

  if (!isStripeConfigured()) {
    return Response.json(
      { message: "Stripe checkout is not configured yet." },
      { status: 503 },
    );
  }

  const profile = await getProfileByEmail(sessionEmail);

  if (!profile) {
    return unauthorized("Your session has expired. Please log in again.");
  }

  try {
    const checkoutSession = await createCheckoutSessionForParent({
      origin: getRequestOrigin(request),
      profile,
      pricingMarket: getPricingMarketFromRequest(request),
      subscriptionPlan,
      trialDays: 7,
    });

    await updateParentSubscription(sessionEmail, {
      subscriptionPlan,
      stripeCustomerId: checkoutSession.stripeCustomerId,
    });

    return Response.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("billing checkout route: failed to create Stripe session", error);

    return Response.json(
      {
        message: "We could not open Stripe checkout right now. Please try again.",
      },
      { status: 503 },
    );
  }
}
