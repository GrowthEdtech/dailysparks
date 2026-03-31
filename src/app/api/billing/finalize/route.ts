import { finalizeCheckoutSessionForParent } from "../../../../lib/stripe";
import {
  clearSessionCookieHeader,
  getSessionEmailFromRequest,
} from "../../../../lib/session";

type FinalizeBillingBody = {
  sessionId?: unknown;
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
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const sessionEmail = await getSessionEmailFromRequest(request);

  if (!sessionEmail) {
    return unauthorized("Please log in to continue.");
  }

  const body = (await request.json().catch(() => null)) as FinalizeBillingBody | null;

  if (!body) {
    return badRequest("Please submit a valid request body.");
  }

  const sessionId = normalizeString(body.sessionId);

  if (!sessionId) {
    return badRequest("Missing Stripe checkout session.");
  }

  try {
    const profile = await finalizeCheckoutSessionForParent({
      sessionId,
      expectedEmail: sessionEmail,
    });

    return Response.json(profile);
  } catch (error) {
    console.error("billing finalize route: failed to confirm Stripe session", error);

    return Response.json(
      {
        message:
          "Stripe checkout returned, but Daily Sparks could not confirm the subscription yet.",
      },
      { status: 503 },
    );
  }
}
