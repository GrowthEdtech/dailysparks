import { getProfileByEmail } from "../../../../lib/mvp-store";
import {
  clearSessionCookieHeader,
  getSessionEmailFromRequest,
} from "../../../../lib/session";
import { getRequestOrigin } from "../../../../lib/request-origin";
import { createBillingPortalSessionForParent } from "../../../../lib/stripe";

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

export async function POST(request: Request) {
  const sessionEmail = await getSessionEmailFromRequest(request);

  if (!sessionEmail) {
    return unauthorized("Please log in to continue.");
  }

  const profile = await getProfileByEmail(sessionEmail);

  if (!profile) {
    return unauthorized("Your session has expired. Please log in again.");
  }

  try {
    const session = await createBillingPortalSessionForParent(
      getRequestOrigin(request),
      profile,
    );

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("billing portal route: failed to create Stripe portal session", error);

    return Response.json(
      {
        message: "We could not open the Stripe billing portal right now.",
      },
      { status: 503 },
    );
  }
}
