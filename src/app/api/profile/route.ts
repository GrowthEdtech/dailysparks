import { getProfileByEmail, updateStudentPreferences } from "../../../lib/mvp-store";
import {
  clearSessionCookieHeader,
  getSessionEmailFromRequest,
} from "../../../lib/session";
import {
  isProgramme,
  isValidProgrammeYear,
} from "../../../lib/mvp-types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type UpdateProfileBody = {
  studentName?: unknown;
  goodnotesEmail?: unknown;
  programme?: unknown;
  programmeYear?: unknown;
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

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeProgramme(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeProgrammeYear(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number.parseInt(value, 10);
  }

  return Number.NaN;
}

function isValidEmail(value: string) {
  return EMAIL_REGEX.test(value);
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

  return Response.json(profile);
}

export async function PUT(request: Request) {
  const sessionEmail = await getSessionEmailFromRequest(request);

  if (!sessionEmail) {
    return unauthorized("Please log in to continue.");
  }

  const body = (await request.json().catch(() => null)) as UpdateProfileBody | null;

  if (!body) {
    return badRequest("Please submit a valid request body.");
  }

  const studentName = normalizeString(body.studentName);
  const goodnotesEmail = normalizeEmail(body.goodnotesEmail);
  const programme = normalizeProgramme(body.programme);
  const programmeYear = normalizeProgrammeYear(body.programmeYear);

  if (!isProgramme(programme)) {
    return badRequest("Please select a valid IB programme.");
  }

  if (!Number.isInteger(programmeYear) || !isValidProgrammeYear(programme, programmeYear)) {
    return badRequest("Please select a valid year for the chosen programme.");
  }

  if (goodnotesEmail && !isValidEmail(goodnotesEmail)) {
    return badRequest("Please enter a valid GoodNotes email address.");
  }

  const profile = await updateStudentPreferences(sessionEmail, {
    studentName,
    goodnotesEmail,
    programme,
    programmeYear,
  });

  if (!profile) {
    return unauthorized("Your session has expired. Please log in again.");
  }

  return Response.json(profile);
}
