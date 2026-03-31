import { updateParentSubscription } from "../../../lib/mvp-store";
import {
  clearSessionCookieHeader,
  getSessionEmailFromRequest,
} from "../../../lib/session";
import { isSubscriptionPlan } from "../../../lib/mvp-types";

type UpdateBillingBody = {
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

export async function PUT(request: Request) {
  const sessionEmail = await getSessionEmailFromRequest(request);

  if (!sessionEmail) {
    return unauthorized("Please log in to continue.");
  }

  const body = (await request.json().catch(() => null)) as UpdateBillingBody | null;

  if (!body) {
    return badRequest("Please submit a valid request body.");
  }

  const subscriptionPlan = normalizeString(body.subscriptionPlan);

  if (!isSubscriptionPlan(subscriptionPlan)) {
    return badRequest("Please select either the monthly or yearly plan.");
  }

  const profile = await updateParentSubscription(sessionEmail, {
    subscriptionPlan,
  });

  if (!profile) {
    return unauthorized("Your session has expired. Please log in again.");
  }

  return Response.json(profile);
}
