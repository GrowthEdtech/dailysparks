import {
  updateParentDeliveryPreferences,
  getProfileByEmail,
} from "../../../../lib/mvp-store";
import {
  clearSessionCookieHeader,
  getSessionEmailFromRequest,
} from "../../../../lib/session";
import { resolveDeliveryPreferences } from "../../../../lib/delivery-locale";

type UpdateDeliveryPreferencesBody = {
  countryCode?: unknown;
  deliveryTimeZone?: unknown;
  preferredDeliveryLocalTime?: unknown;
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

export async function GET(request: Request) {
  const sessionEmail = await getSessionEmailFromRequest(request);

  if (!sessionEmail) {
    return unauthorized("Please log in to continue.");
  }

  const profile = await getProfileByEmail(sessionEmail);

  if (!profile) {
    return unauthorized("Your session has expired. Please log in again.");
  }

  return Response.json({
    countryCode: profile.parent.countryCode,
    deliveryTimeZone: profile.parent.deliveryTimeZone,
    preferredDeliveryLocalTime: profile.parent.preferredDeliveryLocalTime,
  });
}

export async function PUT(request: Request) {
  const sessionEmail = await getSessionEmailFromRequest(request);

  if (!sessionEmail) {
    return unauthorized("Please log in to continue.");
  }

  const body = (await request.json().catch(() => null)) as UpdateDeliveryPreferencesBody | null;

  if (!body) {
    return badRequest("Please submit a valid request body.");
  }

  const nextPreferences = resolveDeliveryPreferences({
    countryCode: normalizeString(body.countryCode),
    deliveryTimeZone: normalizeString(body.deliveryTimeZone),
    preferredDeliveryLocalTime: normalizeString(
      body.preferredDeliveryLocalTime,
    ),
  });
  const profile = await updateParentDeliveryPreferences(sessionEmail, nextPreferences);

  if (!profile) {
    return unauthorized("Your session has expired. Please log in again.");
  }

  return Response.json(profile);
}
