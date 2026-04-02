import {
  clearEditorialAdminSessionCookieHeader,
  createEditorialAdminSession,
  isEditorialAdminAuthConfigured,
  verifyEditorialAdminPassword,
} from "../../../../lib/editorial-admin-auth";

type AdminLoginRequestBody = {
  password?: unknown;
};

function badRequest(message: string) {
  return Response.json({ message }, { status: 400 });
}

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

export async function POST(request: Request) {
  if (!isEditorialAdminAuthConfigured()) {
    return Response.json(
      {
        message: "Editorial admin password login is not configured yet.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | AdminLoginRequestBody
    | null;
  const password = typeof body?.password === "string" ? body.password : "";

  if (!password) {
    return badRequest("Please enter the editorial admin password.");
  }

  if (!verifyEditorialAdminPassword(password)) {
    return unauthorized("Invalid editorial admin password.");
  }

  const session = createEditorialAdminSession();

  return Response.json(
    { success: true },
    {
      status: 200,
      headers: {
        "Set-Cookie": session.cookieHeader,
      },
    },
  );
}
