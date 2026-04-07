import { revalidatePath } from "next/cache";

import { POST as deliverDailyBriefRoute } from "../../internal/daily-brief/deliver/route";
import {
  clearEditorialAdminSessionCookieHeader,
  getEditorialAdminSessionFromRequest,
} from "../../../../lib/editorial-admin-auth";
import {
  getDailyBriefHistoryEntry,
  updateDailyBriefHistoryEntry,
} from "../../../../lib/daily-brief-history-store";
import { emitDailyBriefOpsAlert } from "../../../../lib/daily-brief-ops-alerts";
import { listDispatchableDeliveryProfiles } from "../../../../lib/mvp-store";
import {
  getDailyBriefSchedulerHeaderName,
  getDailyBriefSchedulerSecret,
} from "../../../../lib/daily-brief-run-auth";
import { resolveDailyBriefRendererFromHistory } from "../../../../lib/daily-brief-renderer-policy";
import {
  releaseDailyBriefSyntheticCanaryState,
  runDailyBriefSyntheticCanary,
} from "../../../../lib/daily-brief-synthetic-canary";

type DailyBriefSyntheticCanaryActionRequestBody = {
  briefId?: unknown;
  action?: unknown;
  releaseReason?: unknown;
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

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAction(value: unknown) {
  return value === "release" ||
      value === "rerun" ||
      value === "release-and-deliver" ||
      value === "rerun-and-deliver"
    ? value
    : null;
}

function shouldDeliverAfterAction(action: NonNullable<ReturnType<typeof normalizeAction>>) {
  return action === "release-and-deliver" || action === "rerun-and-deliver";
}

async function triggerProductionDeliveryForBrief(brief: { id: string; scheduledFor: string }) {
  const response = await deliverDailyBriefRoute(
    new Request("http://localhost:3000/api/internal/daily-brief/deliver", {
      method: "POST",
      headers: {
        [getDailyBriefSchedulerHeaderName()]: getDailyBriefSchedulerSecret(),
        "content-type": "application/json",
      },
      body: JSON.stringify({
        briefId: brief.id,
        runDate: brief.scheduledFor,
        recordKind: "production",
        forceDispatch: true,
        dispatchTimestamp: new Date().toISOString(),
      }),
    }),
  );
  const body = (await response.json().catch(() => null)) as
    | { message?: string; summary?: Record<string, unknown> }
    | null;

  if (!response.ok) {
    throw new Error(
      body?.message ?? "Production delivery could not be resumed after synthetic canary release.",
    );
  }

  return body?.summary ?? null;
}

async function parseRequestBody(
  request: Request,
): Promise<DailyBriefSyntheticCanaryActionRequestBody | Response> {
  const contentLength = request.headers.get("content-length");

  if (contentLength === "0") {
    return {};
  }

  const bodyText = await request.text();

  if (!bodyText.trim()) {
    return {};
  }

  try {
    return JSON.parse(bodyText) as DailyBriefSyntheticCanaryActionRequestBody;
  } catch {
    return badRequest("Request body must be valid JSON.");
  }
}

function revalidateDailyBriefAdminPaths(briefId: string) {
  revalidatePath("/admin/editorial/daily-briefs");
  revalidatePath(`/admin/editorial/daily-briefs/${briefId}`);
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

  const briefId = normalizeString(parsedBody.briefId);
  const action = normalizeAction(parsedBody.action);
  const releaseReason = normalizeString(parsedBody.releaseReason);

  if (!briefId) {
    return badRequest("briefId is required.");
  }

  if (!action) {
    return badRequest(
      "action must be release, rerun, release-and-deliver, or rerun-and-deliver.",
    );
  }

  const brief = await getDailyBriefHistoryEntry(briefId);

  if (!brief) {
    return notFound("This daily brief record does not exist anymore.");
  }

  if (brief.recordKind !== "production") {
    return conflict("Synthetic canary controls only apply to production briefs.");
  }

  if (action === "release" || action === "release-and-deliver") {
    const releasedState = releaseDailyBriefSyntheticCanaryState({
      previousState: brief.syntheticCanary,
      releasedAt: new Date().toISOString(),
      releasedBy: session.role,
      releaseReason,
    });

    await updateDailyBriefHistoryEntry(brief.id, {
      syntheticCanary: releasedState,
      failureReason: "",
      adminNotes: [
        brief.adminNotes.trim(),
        `Synthetic canary gate was manually released by editorial admin.${releaseReason ? ` Reason: ${releaseReason}` : ""}`,
      ]
        .filter(Boolean)
        .join("\n"),
    });
    revalidateDailyBriefAdminPaths(brief.id);

    const deliverySummary = shouldDeliverAfterAction(action)
      ? await triggerProductionDeliveryForBrief(brief)
      : null;

    return Response.json({
      success: true,
      action,
      briefId: brief.id,
      syntheticCanaryStatus: releasedState.status,
      deliverySummary,
    });
  }

  const dispatchableProfiles = await listDispatchableDeliveryProfiles();
  const renderer = resolveDailyBriefRendererFromHistory({
    brief,
    attachmentMode: "canary",
  }).renderer;
  const rerunResult = await runDailyBriefSyntheticCanary({
    brief,
    dispatchableProfiles,
    renderer,
    attemptTimestamp: new Date().toISOString(),
    previousState: brief.syntheticCanary,
    targetParentEmails: brief.syntheticCanary?.targetParentEmails,
  });

  await updateDailyBriefHistoryEntry(brief.id, {
    syntheticCanary: rerunResult.state,
    failureReason: rerunResult.passed
      ? ""
      : rerunResult.state.lastFailureReason
        ? `Synthetic canary gate blocked production delivery. ${rerunResult.state.lastFailureReason}`
        : "Synthetic canary gate blocked production delivery.",
    adminNotes: [
      brief.adminNotes.trim(),
      rerunResult.passed
        ? "Synthetic canary was rerun manually and passed."
        : "Synthetic canary was rerun manually but remains blocked.",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  if (!rerunResult.passed) {
    await emitDailyBriefOpsAlert({
      stage: "deliver",
      severity: "critical",
      runDate: brief.scheduledFor,
      title: "Daily brief remains blocked after manual canary rerun",
      message:
        "A manual synthetic canary rerun still failed, so the production wave remains on hold.",
      details: {
        programme: brief.programme,
        syntheticCanaryFailureReason: rerunResult.state.lastFailureReason,
        canaryTargetParentEmails: rerunResult.state.targetParentEmails,
      },
    });
  }

  revalidateDailyBriefAdminPaths(brief.id);

  const deliverySummary =
    rerunResult.passed && shouldDeliverAfterAction(action)
      ? await triggerProductionDeliveryForBrief(brief)
      : null;

  return Response.json({
    success: true,
    action,
    briefId: brief.id,
    syntheticCanaryStatus: rerunResult.state.status,
    deliverySummary,
  });
}
