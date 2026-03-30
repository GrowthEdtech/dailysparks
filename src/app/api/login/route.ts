import { getOrCreateParentProfile, getProfileByEmail } from "../../../lib/mvp-store";
import { createSessionCookieHeader } from "../../../lib/session";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LoginRequestBody = {
  email?: unknown;
  fullName?: unknown;
  studentName?: unknown;
};

function isValidEmail(value: string) {
  return EMAIL_REGEX.test(value);
}

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

  const email = normalizeString(body.email).toLowerCase();
  const fullName = normalizeString(body.fullName);
  const studentName = normalizeString(body.studentName);

  if (!email || !isValidEmail(email)) {
    return badRequest("Please enter a valid email address.");
  }

  const existingProfile = await getProfileByEmail(email);

  if (!existingProfile && !studentName) {
    return badRequest("Please add your child's name to start the profile.");
  }

  const profile = await getOrCreateParentProfile({
    email,
    fullName,
    studentName,
  });

  return Response.json(profile, {
    status: 200,
    headers: {
      "Set-Cookie": createSessionCookieHeader(profile.parent.email),
    },
  });
}
