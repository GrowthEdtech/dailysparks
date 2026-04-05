import {
  clearEditorialAdminSessionCookieHeader,
  getEditorialAdminSessionFromRequest,
} from "../../../../../lib/editorial-admin-auth";
import { getDailyBriefHistoryEntry } from "../../../../../lib/daily-brief-history-store";
import { renderOutboundDailyBriefTypstPrototype } from "../../../../../lib/outbound-daily-brief-typst";

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

  const prototype = await renderOutboundDailyBriefTypstPrototype(brief);
  const requestUrl = new URL(request.url);

  if (requestUrl.searchParams.get("format") === "source") {
    return new Response(prototype.source, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  }

  const pdfBody = new Uint8Array(prototype.pdf).slice().buffer;

  return new Response(pdfBody, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${prototype.fileName}"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
