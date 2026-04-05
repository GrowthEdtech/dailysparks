import {
  buildEditorialCohortEvaluationDate,
  getEditorialCohortForProfile,
} from "../../../../lib/daily-brief-cohorts";
import {
  clearEditorialAdminSessionCookieHeader,
  getEditorialAdminSessionFromRequest,
} from "../../../../lib/editorial-admin-auth";
import {
  DAILY_BRIEF_PDF_RENDERERS,
  type DailyBriefPdfRenderer,
} from "../../../../lib/goodnotes-delivery";
import { listDailyBriefHistory } from "../../../../lib/daily-brief-history-store";
import { deliverBriefToSingleProfile } from "../../../../lib/daily-brief-manual-delivery";
import {
  getDailyBriefSchedulerHeaderName,
  getDailyBriefSchedulerSecret,
  isDailyBriefSchedulerConfigured,
} from "../../../../lib/daily-brief-run-auth";
import { getNextDailyBriefBusinessDate } from "../../../../lib/daily-brief-run-date";
import { getProfileByEmail } from "../../../../lib/mvp-store";
import { POST as deliverDailyBriefRoute } from "../../internal/daily-brief/deliver/route";
import { POST as generateDailyBriefRoute } from "../../internal/daily-brief/generate/route";
import { POST as ingestDailyBriefRoute } from "../../internal/daily-brief/ingest/route";
import { POST as preflightDailyBriefRoute } from "../../internal/daily-brief/preflight/route";

type DailyBriefTestRunRequestBody = {
  runDate?: unknown;
  parentEmail?: unknown;
  renderer?: unknown;
};

type DailyBriefStageResponse = {
  ok: boolean;
  status: number;
  body: Record<string, unknown>;
};

const DEFAULT_DAILY_BRIEF_TEST_TARGET_PARENT_EMAIL = "admin@geledtech.com";

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

function serviceUnavailable(message: string) {
  return Response.json({ message }, { status: 503 });
}

function isValidRunDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
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

function isManualFallbackEligibleBrief(
  brief: Awaited<ReturnType<typeof listDailyBriefHistory>>[number],
) {
  return (
    brief.status === "published" ||
    (brief.status === "approved" &&
      (brief.pipelineStage === "preflight_passed" ||
        brief.pipelineStage === "delivering" ||
        brief.pipelineStage === "published"))
  );
}

async function requireAdminSession(request: Request) {
  const session = await getEditorialAdminSessionFromRequest(request);

  if (!session) {
    return {
      errorResponse: unauthorized("Please log in to the editorial admin."),
      session: null,
    };
  }

  return {
    errorResponse: null,
    session,
  };
}

async function parseRequestBody(
  request: Request,
): Promise<DailyBriefTestRunRequestBody | Response> {
  const contentLength = request.headers.get("content-length");

  if (contentLength === "0") {
    return {};
  }

  const bodyText = await request.text();

  if (!bodyText.trim()) {
    return {};
  }

  try {
    const payload = JSON.parse(bodyText) as DailyBriefTestRunRequestBody;

    if (
      payload.runDate !== undefined &&
      (typeof payload.runDate !== "string" || !isValidRunDate(payload.runDate))
    ) {
      return badRequest("runDate must use YYYY-MM-DD format.");
    }

    if (
      payload.parentEmail !== undefined &&
      normalizeEmail(payload.parentEmail).length === 0
    ) {
      return badRequest("parentEmail must be a non-empty email address.");
    }

    if (
      payload.renderer !== undefined &&
      normalizeRenderer(payload.renderer) === undefined
    ) {
      return badRequest("renderer must be pdf-lib or typst when provided.");
    }

    return payload;
  } catch {
    return badRequest("Request body must be valid JSON.");
  }
}

function buildSchedulerRequest(pathname: string, body: Record<string, unknown>) {
  return new Request(`http://localhost:3000${pathname}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      [getDailyBriefSchedulerHeaderName()]: getDailyBriefSchedulerSecret(),
    },
    body: JSON.stringify(body),
  });
}

async function readStageResponse(
  response: Response,
): Promise<DailyBriefStageResponse> {
  const body = await response.json().catch(async () => ({
    message: await response.text().catch(() => "Unable to read stage response."),
  }));

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}

export async function POST(request: Request) {
  const adminCheck = await requireAdminSession(request);

  if (adminCheck.errorResponse) {
    return adminCheck.errorResponse;
  }

  if (!isDailyBriefSchedulerConfigured()) {
    return serviceUnavailable(
      "Daily brief scheduler secret is not configured yet.",
    );
  }

  const parsedBody = await parseRequestBody(request);

  if (parsedBody instanceof Response) {
    return parsedBody;
  }

  const runDate =
    typeof parsedBody.runDate === "string"
      ? parsedBody.runDate
      : getNextDailyBriefBusinessDate();
  const targetParentEmail =
    normalizeEmail(parsedBody.parentEmail) ||
    DEFAULT_DAILY_BRIEF_TEST_TARGET_PARENT_EMAIL;
  const renderer = normalizeRenderer(parsedBody.renderer) ?? "pdf-lib";
  const targetParentEmails = [targetParentEmail];
  const targetProfile = await getProfileByEmail(targetParentEmail);

  if (!targetProfile) {
    return Response.json(
      {
        message: "We could not find a family profile for that test recipient.",
      },
      { status: 404 },
    );
  }

  const editorialCohort = targetProfile
    ? getEditorialCohortForProfile(
        targetProfile,
        buildEditorialCohortEvaluationDate(runDate),
      )
    : "APAC";

  const ingest = await readStageResponse(
    await ingestDailyBriefRoute(
      buildSchedulerRequest("/api/internal/daily-brief/ingest", {
        runDate,
        recordKind: "test",
      }),
    ),
  );

  if (!ingest.ok) {
    return Response.json(
      {
        success: false,
        failedStage: "ingest",
        runDate,
        targetParentEmails,
        stages: { ingest },
      },
      { status: ingest.status },
    );
  }

  const generate = await readStageResponse(
    await generateDailyBriefRoute(
      buildSchedulerRequest("/api/internal/daily-brief/generate", {
        runDate,
        recordKind: "test",
        editorialCohort,
      }),
    ),
  );

  if (!generate.ok) {
    return Response.json(
      {
        success: false,
        failedStage: "generate",
        runDate,
        targetParentEmails,
        stages: { ingest, generate },
      },
      { status: generate.status },
    );
  }

  const preflight = await readStageResponse(
    await preflightDailyBriefRoute(
      buildSchedulerRequest("/api/internal/daily-brief/preflight", {
        runDate,
        recordKind: "test",
        editorialCohort,
      }),
    ),
  );

  if (!preflight.ok || preflight.body.ready === false) {
    return Response.json(
      {
        success: false,
        failedStage: "preflight",
        runDate,
        targetParentEmails,
        stages: { ingest, generate, preflight },
      },
      { status: preflight.ok ? 409 : preflight.status },
    );
  }

  const deliver = await readStageResponse(
    await deliverDailyBriefRoute(
      buildSchedulerRequest("/api/internal/daily-brief/deliver", {
        runDate,
        recordKind: "test",
        dispatchMode: "canary",
        canaryParentEmails: targetParentEmails,
        forceDispatch: true,
        renderer,
      }),
    ),
  );

  if (!deliver.ok) {
    return Response.json(
      {
        success: false,
        failedStage: "deliver",
        runDate,
        editorialCohort,
        targetParentEmails,
        stages: { ingest, generate, preflight, deliver },
      },
      { status: deliver.status },
    );
  }

  const deliverSummary =
    typeof deliver.body.summary === "object" && deliver.body.summary !== null
      ? (deliver.body.summary as Record<string, unknown>)
      : null;
  const targetedProfileCount =
    typeof deliverSummary?.targetedProfileCount === "number"
      ? deliverSummary.targetedProfileCount
      : 0;

  if (targetedProfileCount === 0) {
    const matchingTargetBrief = (
      await listDailyBriefHistory({
        scheduledFor: runDate,
        recordKind: "test",
        editorialCohort,
        programme: targetProfile.student.programme,
      })
    ).find(
      (brief) =>
        brief.programme === targetProfile.student.programme &&
        isManualFallbackEligibleBrief(brief),
    );

    if (matchingTargetBrief) {
      try {
        const manualBackfill = await deliverBriefToSingleProfile({
          brief: matchingTargetBrief,
          profile: targetProfile,
          renderer,
          notePrefix: `Manual staged test fallback requested for ${targetParentEmail}.`,
        });

        deliver.body = {
          ...deliver.body,
          manualBackfill: {
            briefId: matchingTargetBrief.id,
            parentEmail: targetParentEmail,
            renderer,
            deliveryAttemptCount:
              manualBackfill.deliverySummary.deliveryAttemptCount,
            deliverySuccessCount:
              manualBackfill.deliverySummary.deliverySuccessCount,
            deliveryFailureCount:
              manualBackfill.deliverySummary.deliveryFailureCount,
          },
        };
      } catch (error) {
        deliver.body = {
          ...deliver.body,
          manualBackfill: {
            briefId: matchingTargetBrief.id,
            parentEmail: targetParentEmail,
            renderer,
            errorMessage:
              error instanceof Error
                ? error.message
                : "Manual staged test fallback failed.",
          },
        };
      }
    } else {
      deliver.body = {
        ...deliver.body,
        manualBackfill: {
          parentEmail: targetParentEmail,
          renderer,
          skippedReason:
            "No approved or published same-day test brief was available for fallback delivery.",
        },
      };
    }
  }

  return Response.json({
    success: true,
    runDate,
    editorialCohort,
    targetParentEmails,
    renderer,
    stages: {
      ingest,
      generate,
      preflight,
      deliver,
    },
  });
}
