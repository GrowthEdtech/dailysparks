import {
  getProfileByEmail,
  updateStudentGoodnotesDelivery,
  updateParentGrowthMilestones,
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
    return badRequest("Save a Goodnotes destination before sending a welcome note.");
  }

  if (!isGoodnotesDeliveryConfigured()) {
    const profile = await updateStudentGoodnotesDelivery(sessionEmail, {
      goodnotesConnected: false,
      goodnotesLastDeliveryStatus: "failed",
      goodnotesLastDeliveryMessage:
        "Goodnotes delivery is not configured yet. Please finish the delivery setup before sending a welcome note.",
    });

    return Response.json(
      {
        ...(profile ?? existingProfile),
        message:
          "Goodnotes delivery is not configured yet. Please finish the delivery setup before sending a welcome note.",
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
        "We could not send the Goodnotes welcome note right now. Please try again.",
    });

    return Response.json(
      {
        ...(failedProfile ?? existingProfile),
        message: "We could not send the Goodnotes welcome note right now. Please try again.",
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
      "Welcome note sent. Goodnotes delivery is ready for this destination.",
  });

  if (!profile) {
    return unauthorized("Your session has expired. Please log in again.");
  }

  // Update activation milestones
  await updateParentGrowthMilestones(sessionEmail, {
    firstBriefDeliveredAt: profile.parent.firstBriefDeliveredAt ?? timestamp,
    firstDispatchableChannelAt: profile.parent.firstDispatchableChannelAt ?? timestamp,
  });

  return Response.json({
    ...profile,
    message: "Goodnotes welcome note sent.",
  });
}
