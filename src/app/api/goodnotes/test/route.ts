import {
  getProfileByEmail,
  updateStudentGoodnotesDelivery,
} from "../../../../lib/mvp-store";
import {
  clearSessionCookieHeader,
  getSessionEmailFromRequest,
} from "../../../../lib/session";

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

export async function POST(request: Request) {
  const sessionEmail = await getSessionEmailFromRequest(request);

  if (!sessionEmail) {
    return unauthorized("Please log in to continue.");
  }

  const existingProfile = await getProfileByEmail(sessionEmail);

  if (!existingProfile) {
    return unauthorized("Your session has expired. Please log in again.");
  }

  if (!existingProfile.student.goodnotesEmail) {
    return badRequest("Save a Goodnotes email before sending a test brief.");
  }

  const timestamp = new Date().toISOString();
  const profile = await updateStudentGoodnotesDelivery(sessionEmail, {
    goodnotesConnected: true,
    goodnotesVerifiedAt: existingProfile.student.goodnotesVerifiedAt ?? timestamp,
    goodnotesLastTestSentAt: timestamp,
    goodnotesLastDeliveryStatus: "success",
    goodnotesLastDeliveryMessage:
      "Test brief recorded. Goodnotes delivery is ready for this destination.",
  });

  if (!profile) {
    return unauthorized("Your session has expired. Please log in again.");
  }

  return Response.json({
    ...profile,
    message: "Goodnotes test brief recorded.",
  });
}
