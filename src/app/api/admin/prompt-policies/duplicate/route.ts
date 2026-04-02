import { duplicatePromptPolicy } from "../../../../../lib/prompt-policy-store";
import {
  clearEditorialAdminSessionCookieHeader,
  getEditorialAdminSessionFromRequest,
} from "../../../../../lib/editorial-admin-auth";

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

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const session = await getEditorialAdminSessionFromRequest(request);

  if (!session) {
    return unauthorized("Please log in to the editorial admin.");
  }

  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const id = normalizeString(body?.id);

  if (!id) {
    return badRequest("Please choose a prompt policy to duplicate.");
  }

  const policy = await duplicatePromptPolicy(id);

  if (!policy) {
    return Response.json(
      { message: "We could not duplicate that prompt policy." },
      { status: 404 },
    );
  }

  return Response.json({ policy });
}
