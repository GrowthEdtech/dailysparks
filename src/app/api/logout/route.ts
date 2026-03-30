import { clearSessionCookieHeader } from "../../../lib/session";

export async function POST() {
  return Response.json(
    { success: true },
    {
      status: 200,
      headers: {
        "Set-Cookie": clearSessionCookieHeader(),
      },
    },
  );
}
