import {
  constructStripeWebhookEvent,
  handleStripeWebhookEvent,
  isStripeWebhookConfigured,
} from "../../../../lib/stripe";

function badRequest(message: string) {
  return Response.json({ message }, { status: 400 });
}

function serviceUnavailable(message: string) {
  return Response.json({ message }, { status: 503 });
}

export async function POST(request: Request) {
  if (!isStripeWebhookConfigured()) {
    return serviceUnavailable("Stripe webhook signing is not configured yet.");
  }

  const signature = request.headers.get("stripe-signature")?.trim() ?? "";

  if (!signature) {
    return badRequest("Missing Stripe webhook signature.");
  }

  const payload = await request.text();

  try {
    const event = constructStripeWebhookEvent(payload, signature);
    await handleStripeWebhookEvent(event);

    return Response.json({ received: true });
  } catch (error) {
    console.error("stripe webhook route: failed to verify or process event", error);

    return badRequest("We could not verify the Stripe webhook signature.");
  }
}
