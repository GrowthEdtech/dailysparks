import {
  clearEditorialAdminSessionCookieHeader,
  getEditorialAdminSessionFromRequest,
} from "../../../../../lib/editorial-admin-auth";
import { seedWebsiteDerivedGeoPrompts } from "../../../../../lib/geo-prompt-seeding";

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
  const session = await getEditorialAdminSessionFromRequest(request);

  if (!session) {
    return unauthorized("Please log in to the editorial admin.");
  }

  const result = await seedWebsiteDerivedGeoPrompts();
  return Response.json(result);
}
