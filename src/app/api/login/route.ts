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

  try {
    const session = await createSessionFromIdToken(idToken);
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
  } catch {
    return Response.json(
      { message: "Google sign-in failed. Please try again." },
      { status: 401 },
    );
  }
}
