import {
  getProfileByEmail,
  updateStudentGoodnotesDelivery,
} from "../../../../lib/mvp-store";
import {
  isGoodnotesDeliveryConfigured,
  sendTestBriefToGoodnotes,
} from "../../../../lib/goodnotes-delivery";
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

  if (!isGoodnotesDeliveryConfigured()) {
    const profile = await updateStudentGoodnotesDelivery(sessionEmail, {
      goodnotesConnected: false,
      goodnotesLastDeliveryStatus: "failed",
      goodnotesLastDeliveryMessage:
        "Goodnotes delivery is not configured yet. Please finish the delivery setup before sending a test brief.",
    });

    return Response.json(
      {
        ...(profile ?? existingProfile),
        message:
          "Goodnotes delivery is not configured yet. Please finish the delivery setup before sending a test brief.",
      },
      { status: 503 },
    );
  }

  const timestamp = new Date().toISOString();

  try {
    await sendTestBriefToGoodnotes(existingProfile);
  } catch {
    const failedProfile = await updateStudentGoodnotesDelivery(sessionEmail, {
      goodnotesConnected: false,
      goodnotesLastDeliveryStatus: "failed",
      goodnotesLastDeliveryMessage:
        "We could not send the Goodnotes test brief right now. Please try again.",
    });

    return Response.json(
      {
        ...(failedProfile ?? existingProfile),
        message: "We could not send the Goodnotes test brief right now. Please try again.",
      },
      { status: 502 },
    );
  }

  const profile = await updateStudentGoodnotesDelivery(sessionEmail, {
    goodnotesConnected: true,
    goodnotesVerifiedAt: existingProfile.student.goodnotesVerifiedAt ?? timestamp,
    goodnotesLastTestSentAt: timestamp,
    goodnotesLastDeliveryStatus: "success",
    goodnotesLastDeliveryMessage:
      "Test brief sent. Goodnotes delivery is ready for this destination.",
  });

  if (!profile) {
    return unauthorized("Your session has expired. Please log in again.");
  }

  return Response.json({
    ...profile,
    message: "Goodnotes test brief sent.",
  });
}
