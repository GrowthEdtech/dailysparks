import { revalidatePath } from "next/cache";

import {
  clearEditorialAdminSessionCookieHeader,
  getEditorialAdminSessionFromRequest,
} from "../../../../lib/editorial-admin-auth";
import {
  performPlannedNotificationAction,
  type PlannedNotificationAction,
} from "../../../../lib/planned-notification-admin-actions";
import type { PlannedNotificationFamily } from "../../../../lib/planned-notification-state";

type PlannedNotificationActionRequestBody = {
  parentEmail?: unknown;
  notificationFamily?: unknown;
  action?: unknown;
  assignee?: unknown;
  opsNote?: unknown;
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

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeFamily(value: unknown): PlannedNotificationFamily | null {
  return value === "trial-ending-reminder" ||
    value === "billing-status-update" ||
    value === "delivery-support-alert"
    ? value
    : null;
}

function normalizeAction(value: unknown): PlannedNotificationAction | null {
  return value === "resend" || value === "resolve" || value === "annotate"
    ? value
    : null;
}

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" ? value.trim() : null;
}

async function parseRequestBody(request: Request) {
  const contentLength = request.headers.get("content-length");

  if (contentLength === "0") {
    return {} satisfies PlannedNotificationActionRequestBody;
  }

  const bodyText = await request.text();

  if (!bodyText.trim()) {
    return {} satisfies PlannedNotificationActionRequestBody;
  }

  try {
    return JSON.parse(bodyText) as PlannedNotificationActionRequestBody;
  } catch {
    return badRequest("Request body must be valid JSON.");
  }
}

function revalidateUserAdminPaths(parentId: string) {
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

  const parentEmail = normalizeEmail(parsedBody.parentEmail);
  const notificationFamily = normalizeFamily(parsedBody.notificationFamily);
  const action = normalizeAction(parsedBody.action);
  const assignee = normalizeOptionalText(parsedBody.assignee);
  const opsNote = normalizeOptionalText(parsedBody.opsNote);

  if (!parentEmail) {
    return badRequest("parentEmail is required.");
  }

  if (!notificationFamily) {
    return badRequest("notificationFamily is required.");
  }

  if (!action) {
    return badRequest("action must be resend, resolve, or annotate.");
  }

  if (
    action === "annotate" &&
    parsedBody.assignee === undefined &&
    parsedBody.opsNote === undefined
  ) {
    return badRequest("annotate requires assignee or opsNote.");
  }

  try {
    const result = await performPlannedNotificationAction({
      parentEmail,
      notificationFamily,
      action,
      assignee,
      opsNote,
    });

    revalidateUserAdminPaths(result.parentId);

    return Response.json({
      success: result.success,
      action,
      notificationFamily,
      parentEmail,
      messageId: result.messageId,
      reason: result.reason,
      assignee: result.assignee,
      opsNote: result.opsNote,
    });
  } catch (error) {
    if (error instanceof Error) {
      if ("statusCode" in error && error.statusCode === 404) {
        return notFound(error.message);
      }

      if ("statusCode" in error && error.statusCode === 409) {
        return conflict(error.message);
      }
    }

    return conflict(
      error instanceof Error
        ? error.message
        : "This notification action could not be completed.",
    );
  }
}
