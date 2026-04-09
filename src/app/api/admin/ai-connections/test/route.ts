import { testAiConnection } from "../../../../../lib/ai-connection-store";
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
    return badRequest("Please choose an AI connection to test.");
  }

  try {
    const result = await testAiConnection(id, {});

    return Response.json({ result });
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "We could not test that AI connection.",
      },
      { status: 404 },
    );
  }
}
