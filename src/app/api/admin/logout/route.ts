import { clearEditorialAdminSessionCookieHeader } from "../../../../lib/editorial-admin-auth";

export async function POST() {
  return Response.json(
    { success: true },
    {
      status: 200,
      headers: {
        "Set-Cookie": clearEditorialAdminSessionCookieHeader(),
      },
    },
  );
}
