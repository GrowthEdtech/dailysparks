import {
  getProfileByEmail,
  updateStudentGoodnotesDelivery,
} from "../../../../lib/mvp-store";
import { sendTestBriefToGoodnotes } from "../../../../lib/goodnotes-delivery";
import {
  clearEditorialAdminSessionCookieHeader,
  getEditorialAdminSessionFromRequest,
} from "../../../../lib/editorial-admin-auth";

type GoodnotesWelcomeNoteTestRequestBody = {
  parentEmail?: unknown;
};

const DEFAULT_TEST_PARENT_EMAIL = "admin@geledtech.com";

function unauthorized(message: string) {
  return Response.json(
    { message },
    {
      status: 401,
      headers: {
        "Set-Cookie": clearEditorialAdminSessionCookieHeader(),
      },
    },
  );
}

function badRequest(message: string) {
  return Response.json({ message }, { status: 400 });
}

function notFound(message: string) {
  return Response.json({ message }, { status: 404 });
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

async function parseRequestBody(request: Request) {
  const contentLength = request.headers.get("content-length");

  if (contentLength === "0") {
    return {} satisfies GoodnotesWelcomeNoteTestRequestBody;
  }

  const bodyText = await request.text();

  if (!bodyText.trim()) {
    return {} satisfies GoodnotesWelcomeNoteTestRequestBody;
  }

  try {
    return JSON.parse(bodyText) as GoodnotesWelcomeNoteTestRequestBody;
  } catch {
    return badRequest("Request body must be valid JSON.");
  }
}

export async function POST(request: Request) {
  const session = await getEditorialAdminSessionFromRequest(request);

  if (!session) {
    return unauthorized("Please log in to the editorial admin.");
  }

  const parsedBody = await parseRequestBody(request);

  if (parsedBody instanceof Response) {
    return parsedBody;
  }

  const parentEmail =
    normalizeEmail(parsedBody.parentEmail) || DEFAULT_TEST_PARENT_EMAIL;

  const existingProfile = await getProfileByEmail(parentEmail);

  if (!existingProfile) {
    return notFound("We could not find a family profile for that email.");
  }

  if (!existingProfile.student.goodnotesEmail) {
    return badRequest(
      "This family has not saved a Goodnotes destination yet.",
    );
  }

  const timestamp = new Date().toISOString();

  try {
    const delivery = await sendTestBriefToGoodnotes(existingProfile);
    const profile = await updateStudentGoodnotesDelivery(parentEmail, {
      goodnotesConnected: true,
      goodnotesVerifiedAt:
        existingProfile.student.goodnotesVerifiedAt ?? timestamp,
      goodnotesLastTestSentAt: timestamp,
      goodnotesLastDeliveryStatus: "success",
      goodnotesLastDeliveryMessage:
        "Welcome note sent. Goodnotes delivery is ready for this destination.",
    });

    return Response.json({
      success: true,
      parentEmail,
      message: "Goodnotes welcome note sent.",
      delivery,
      profile: profile ?? existingProfile,
    });
  } catch {
    const profile = await updateStudentGoodnotesDelivery(parentEmail, {
      goodnotesConnected: false,
      goodnotesLastDeliveryStatus: "failed",
      goodnotesLastDeliveryMessage:
        "We could not send the Goodnotes welcome note right now. Please try again.",
    });

    return Response.json(
      {
        success: false,
        parentEmail,
        message:
          "We could not send the Goodnotes welcome note right now. Please try again.",
        profile: profile ?? existingProfile,
      },
      { status: 502 },
    );
  }
}
