import { revalidatePath } from "next/cache";

import {
  buildEditorialCohortEvaluationDate,
  getEditorialCohortForProfile,
} from "../../../../lib/daily-brief-cohorts";
import {
  getDailyBriefHistoryEntry,
} from "../../../../lib/daily-brief-history-store";
import {
  clearEditorialAdminSessionCookieHeader,
  getEditorialAdminSessionFromRequest,
} from "../../../../lib/editorial-admin-auth";
import { deliverBriefToSingleProfile } from "../../../../lib/daily-brief-manual-delivery";
import {
  DAILY_BRIEF_PDF_RENDERERS,
  type DailyBriefPdfRenderer,
} from "../../../../lib/goodnotes-delivery";
import { getProfileByEmail } from "../../../../lib/mvp-store";

type DailyBriefResendRequestBody = {
  briefId?: unknown;
  parentEmail?: unknown;
  renderer?: unknown;
};

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

function conflict(message: string) {
  return Response.json({ message }, { status: 409 });
}

function notFound(message: string) {
  return Response.json({ message }, { status: 404 });
}

function normalizeId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeRenderer(value: unknown): DailyBriefPdfRenderer | undefined {
  return typeof value === "string" &&
      (DAILY_BRIEF_PDF_RENDERERS as readonly string[]).includes(value)
    ? (value as DailyBriefPdfRenderer)
    : undefined;
}

async function parseRequestBody(request: Request) {
  const contentLength = request.headers.get("content-length");

  if (contentLength === "0") {
    return {} satisfies DailyBriefResendRequestBody;
  }

  const bodyText = await request.text();

  if (!bodyText.trim()) {
    return {} satisfies DailyBriefResendRequestBody;
  }

  try {
    return JSON.parse(bodyText) as DailyBriefResendRequestBody;
  } catch {
    return badRequest("Request body must be valid JSON.");
  }
}

function revalidateEditorialAdminPaths(briefId: string, parentId: string) {
  revalidatePath("/admin/editorial/daily-briefs");
  revalidatePath(`/admin/editorial/daily-briefs/${briefId}`);
  revalidatePath("/admin/editorial/users");
  revalidatePath(`/admin/editorial/users/${parentId}`);
}

export async function POST(request: Request) {
  const session = await getEditorialAdminSessionFromRequest(request);

  if (!session) {
    return unauthorized("Please log in to the editorial admin.");
  }

  const parsedBody = await parseRequestBody(request);

  if (parsedBody instanceof Response) {
    return parsedBody;
  }

  const briefId = normalizeId(parsedBody.briefId);
  const parentEmail = normalizeEmail(parsedBody.parentEmail);
  const renderer = normalizeRenderer(parsedBody.renderer) ?? "pdf-lib";

  if (!briefId) {
    return badRequest("briefId is required.");
  }

  if (!parentEmail) {
    return badRequest("parentEmail is required.");
  }

  if (
    parsedBody.renderer !== undefined &&
    normalizeRenderer(parsedBody.renderer) === undefined
  ) {
    return badRequest("renderer must be pdf-lib or typst when provided.");
  }

  const [brief, profile] = await Promise.all([
    getDailyBriefHistoryEntry(briefId),
    getProfileByEmail(parentEmail),
  ]);

  if (!brief) {
    return notFound("We could not find that daily brief record.");
  }

  if (!profile) {
    return notFound("We could not find a family profile for that email.");
  }

  if (profile.student.programme !== brief.programme) {
    return conflict(
      "This family does not belong to the same programme as the selected brief.",
    );
  }

  const expectedCohort = getEditorialCohortForProfile(
    profile,
    buildEditorialCohortEvaluationDate(brief.scheduledFor),
  );

  if (expectedCohort !== brief.editorialCohort) {
    return conflict(
      "This family does not currently belong to the same editorial cohort as the selected brief.",
    );
  }

  let manualDelivery;

  try {
    manualDelivery = await deliverBriefToSingleProfile({
      brief,
      profile,
      renderer,
      notePrefix: `Manual resend/backfill requested for ${profile.parent.email}.`,
    });
  } catch (error) {
    return conflict(
      error instanceof Error
        ? error.message
        : "This resend request could not be completed.",
    );
  }

  revalidateEditorialAdminPaths(brief.id, profile.parent.id);

  return Response.json({
    success: manualDelivery.deliverySummary.deliveryFailureCount === 0,
    briefId,
    parentEmail,
    renderer,
    deliverySummary: manualDelivery.deliverySummary,
    brief: manualDelivery.updatedBrief ?? brief,
  });
}
