import {
  clearEditorialAdminSessionCookieHeader,
  getEditorialAdminSessionFromRequest,
} from "../../../../../lib/editorial-admin-auth";
import { getDailyBriefHistoryEntry } from "../../../../../lib/daily-brief-history-store";
import { renderDailyBriefThumbnailPng } from "../../../../../lib/daily-brief-thumbnail";

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

function notFound(message: string) {
  return Response.json({ message }, { status: 404 });
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      briefId: string;
    }>;
  },
) {
  const session = await getEditorialAdminSessionFromRequest(request);

  if (!session) {
    return unauthorized("Please log in to the editorial admin.");
  }

  const { briefId } = await context.params;
  const brief = await getDailyBriefHistoryEntry(briefId);

  if (!brief) {
    return notFound("We could not find that daily brief record.");
  }

  const pngBuffer = await renderDailyBriefThumbnailPng(brief);

  return new Response(pngBuffer, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
