import {
  getProfileByEmail,
  updateStudentGoodnotesDelivery,
} from "../../../lib/mvp-store";
import {
  clearSessionCookieHeader,
  getSessionEmailFromRequest,
} from "../../../lib/session";
import {
  isValidGoodnotesAddress,
  normalizeGoodnotesAddress,
} from "../../../lib/goodnotes-address";

type GoodnotesBody = {
  goodnotesEmail?: unknown;
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

export async function PUT(request: Request) {
  const sessionEmail = await getSessionEmailFromRequest(request);

  if (!sessionEmail) {
    return unauthorized("Please log in to continue.");
  }

  const body = (await request.json().catch(() => null)) as GoodnotesBody | null;

  if (!body) {
    return badRequest("Please submit a valid request body.");
  }

  const goodnotesEmail = normalizeGoodnotesAddress(body.goodnotesEmail);

  if (!goodnotesEmail) {
    return badRequest("Please enter the name before @goodnotes.email.");
  }

  if (!isValidGoodnotesAddress(goodnotesEmail)) {
    return badRequest("Please enter a valid name before @goodnotes.email.");
  }

  const existingProfile = await getProfileByEmail(sessionEmail);

  if (!existingProfile) {
    return unauthorized("Your session has expired. Please log in again.");
  }

  if (existingProfile.student.goodnotesEmail === goodnotesEmail) {
    return Response.json({
      ...existingProfile,
      message: existingProfile.student.goodnotesConnected
        ? "This Goodnotes destination is already connected."
        : "This Goodnotes destination is already saved.",
    });
  }

  const profile = await updateStudentGoodnotesDelivery(sessionEmail, {
    goodnotesEmail,
    goodnotesConnected: false,
    goodnotesVerifiedAt: null,
    goodnotesLastTestSentAt: null,
    goodnotesLastDeliveryStatus: "idle",
    goodnotesLastDeliveryMessage:
      "Goodnotes destination saved. Send a welcome note to confirm this destination.",
  });

  if (!profile) {
    return unauthorized("Your session has expired. Please log in again.");
  }

  return Response.json({
    ...profile,
    message: "Goodnotes destination saved.",
  });
}

export async function DELETE(request: Request) {
  const sessionEmail = await getSessionEmailFromRequest(request);

  if (!sessionEmail) {
    return unauthorized("Please log in to continue.");
  }

  const profile = await updateStudentGoodnotesDelivery(sessionEmail, {
    goodnotesEmail: "",
    goodnotesConnected: false,
    goodnotesVerifiedAt: null,
    goodnotesLastTestSentAt: null,
    goodnotesLastDeliveryStatus: null,
    goodnotesLastDeliveryMessage: null,
  });

  if (!profile) {
    return unauthorized("Your session has expired. Please log in again.");
  }

  return Response.json({
    ...profile,
    message: "Goodnotes delivery removed.",
  });
}
