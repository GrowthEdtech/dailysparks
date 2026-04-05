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

type BatchActionItem = {
  parentEmail?: unknown;
  notificationFamily?: unknown;
};

type BatchActionBody = {
  action?: unknown;
  items?: unknown;
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
  return value === "resend" || value === "resolve" ? value : null;
}

async function parseRequestBody(request: Request) {
  const contentLength = request.headers.get("content-length");

  if (contentLength === "0") {
    return {} satisfies BatchActionBody;
  }

  const bodyText = await request.text();

  if (!bodyText.trim()) {
    return {} satisfies BatchActionBody;
  }

  try {
    return JSON.parse(bodyText) as BatchActionBody;
  } catch {
    return badRequest("Request body must be valid JSON.");
  }
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

  const action = normalizeAction(parsedBody.action);

  if (!action) {
    return badRequest("action must be resend or resolve.");
  }

  if (!Array.isArray(parsedBody.items) || parsedBody.items.length === 0) {
    return badRequest("items must be a non-empty array.");
  }

  const items = parsedBody.items
    .map((item) => {
      const rawItem = item as BatchActionItem;

      return {
        parentEmail: normalizeEmail(rawItem.parentEmail),
        notificationFamily: normalizeFamily(rawItem.notificationFamily),
      };
    })
    .filter(
      (
        item,
      ): item is {
        parentEmail: string;
        notificationFamily: PlannedNotificationFamily;
      } => Boolean(item.parentEmail && item.notificationFamily),
    );

  if (items.length === 0) {
    return badRequest("Every batch action item needs parentEmail and notificationFamily.");
  }

  const successes = [];
  const failures = [];

  for (const item of items) {
    try {
      const result = await performPlannedNotificationAction({
        parentEmail: item.parentEmail,
        notificationFamily: item.notificationFamily,
        action,
        mode: "batch",
      });

      successes.push(result);
      revalidatePath(`/admin/editorial/users/${result.parentId}`);
    } catch (error) {
      failures.push({
        parentEmail: item.parentEmail,
        notificationFamily: item.notificationFamily,
        message:
          error instanceof Error ? error.message : "The notification action failed.",
      });
    }
  }

  revalidatePath("/admin/editorial/users");

  return Response.json({
    success: failures.length === 0,
    action,
    successCount: successes.length,
    failureCount: failures.length,
    successes,
    failures,
  });
}
