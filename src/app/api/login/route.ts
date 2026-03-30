import { getOrCreateParentProfile, getProfileByEmail } from "../../../lib/mvp-store";
import { createSessionFromIdToken } from "../../../lib/session";

type LoginRequestBody = {
  idToken?: unknown;
};

function badRequest(message: string) {
  return Response.json({ message }, { status: 400 });
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as LoginRequestBody | null;

  if (!body) {
    return badRequest("Please submit a valid request body.");
  }

  const idToken = normalizeString(body.idToken);

  if (!idToken) {
    return badRequest("Please continue with Google to sign in.");
  }

  let session;

  try {
    session = await createSessionFromIdToken(idToken);
  } catch (error) {
    console.error("login route: failed to create Firebase session", error);

    return Response.json(
      {
        message:
          "Google sign-in succeeded, but Daily Sparks could not create a secure session. Please try again.",
      },
      { status: 401 },
    );
  }

  try {
    const existingProfile = await getProfileByEmail(session.identity.email);
    const profile = await getOrCreateParentProfile({
      email: session.identity.email,
      fullName: session.identity.name,
      studentName: existingProfile?.student.studentName,
    });

    return Response.json(profile, {
      status: 200,
      headers: {
        "Set-Cookie": session.cookieHeader,
      },
    });
  } catch (error) {
    console.error("login route: failed to load or create parent profile", error);

    return Response.json(
      {
        message:
          "Google sign-in succeeded, but Daily Sparks could not load your parent profile. Please try again.",
      },
      { status: 503 },
    );
  }
}
