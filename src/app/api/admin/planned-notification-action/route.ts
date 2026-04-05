import { revalidatePath } from "next/cache";

import {
  clearEditorialAdminSessionCookieHeader,
  getEditorialAdminSessionFromRequest,
} from "../../../../lib/editorial-admin-auth";
import { getProfileByEmail, updateParentNotificationEmailState } from "../../../../lib/mvp-store";
import {
  createPlannedNotificationRunEntry,
} from "../../../../lib/planned-notification-history-store";
import {
  sendBillingStatusUpdateNotification,
  sendDeliverySupportAlertNotification,
  sendTrialEndingReminderNotification,
} from "../../../../lib/planned-notification-emails";
import {
  getBillingStatusNotificationCurrentState,
  getBillingStatusNotificationStatus,
  getDeliverySupportNotificationCurrentState,
  getDeliverySupportNotificationStatus,
  getTrialEndingNotificationCurrentState,
  getTrialEndingNotificationStatus,
  type PlannedNotificationFamily,
} from "../../../../lib/planned-notification-state";

type PlannedNotificationActionRequestBody = {
  parentEmail?: unknown;
  notificationFamily?: unknown;
  action?: unknown;
};

type PlannedNotificationAction = "resend" | "resolve";

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
  return value === "resend" || value === "resolve" ? value : null;
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

  if (!parentEmail) {
    return badRequest("parentEmail is required.");
  }

  if (!notificationFamily) {
    return badRequest("notificationFamily is required.");
  }

  if (!action) {
    return badRequest("action must be resend or resolve.");
  }

  const profile = await getProfileByEmail(parentEmail);

  if (!profile) {
    return notFound("We could not find a family profile for that email.");
  }

  const now = new Date();

  try {
    if (notificationFamily === "trial-ending-reminder") {
      const current = getTrialEndingNotificationCurrentState(profile, now);

      if (!current) {
        return conflict("No current trial-ending notification state is available.");
      }

      if (action === "resolve") {
        await updateParentNotificationEmailState(profile.parent.email, {
          trialEndingReminderLastResolvedAt: now.toISOString(),
          trialEndingReminderLastResolvedTrialEndsAt: current.trialEndsAt,
        });
        await createPlannedNotificationRunEntry({
          runAt: now.toISOString(),
          parentId: profile.parent.id,
          parentEmail: profile.parent.email,
          notificationFamily,
          source: "manual-resolve",
          status: "resolved",
          reason: current.reason,
          deduped: false,
          messageId: null,
          errorMessage: null,
          trialEndsAt: current.trialEndsAt,
          invoiceId: null,
          invoiceStatus: null,
          reasonKey: null,
        });
        revalidateUserAdminPaths(profile.parent.id);
        return Response.json({
          success: true,
          action,
          notificationFamily,
          parentEmail,
        });
      }

      const sendResult = await sendTrialEndingReminderNotification({ profile });
      await createPlannedNotificationRunEntry({
        runAt: now.toISOString(),
        parentId: profile.parent.id,
        parentEmail: profile.parent.email,
        notificationFamily,
        source: "manual-resend",
        status: sendResult.sent ? "sent" : "skipped",
        reason: sendResult.reason ?? current.reason,
        deduped: sendResult.skipped,
        messageId: sendResult.messageId ?? null,
        errorMessage: null,
        trialEndsAt: current.trialEndsAt,
        invoiceId: null,
        invoiceStatus: null,
        reasonKey: null,
      });

      if (sendResult.sent) {
        await updateParentNotificationEmailState(profile.parent.email, {
          trialEndingReminderLastNotifiedAt: now.toISOString(),
          trialEndingReminderLastTrialEndsAt: current.trialEndsAt,
          trialEndingReminderLastResolvedAt: null,
          trialEndingReminderLastResolvedTrialEndsAt: null,
        });
      }

      revalidateUserAdminPaths(profile.parent.id);
      return Response.json({
        success: sendResult.sent,
        action,
        notificationFamily,
        parentEmail,
        messageId: sendResult.messageId ?? null,
        reason: sendResult.reason ?? null,
      });
    }

    if (notificationFamily === "billing-status-update") {
      const current = getBillingStatusNotificationCurrentState(profile);

      if (!current) {
        return conflict("No current billing notification state is available.");
      }

      if (action === "resolve") {
        await updateParentNotificationEmailState(profile.parent.email, {
          billingStatusNotificationLastResolvedAt: now.toISOString(),
          billingStatusNotificationLastResolvedInvoiceId: current.invoiceId,
          billingStatusNotificationLastResolvedInvoiceStatus: current.invoiceStatus,
        });
        await createPlannedNotificationRunEntry({
          runAt: now.toISOString(),
          parentId: profile.parent.id,
          parentEmail: profile.parent.email,
          notificationFamily,
          source: "manual-resolve",
          status: "resolved",
          reason: current.reason,
          deduped: false,
          messageId: null,
          errorMessage: null,
          trialEndsAt: null,
          invoiceId: current.invoiceId,
          invoiceStatus: current.invoiceStatus,
          reasonKey: null,
        });
        revalidateUserAdminPaths(profile.parent.id);
        return Response.json({
          success: true,
          action,
          notificationFamily,
          parentEmail,
        });
      }

      const sendResult = await sendBillingStatusUpdateNotification({
        profile,
        invoiceStatus: current.invoiceStatus,
      });
      await createPlannedNotificationRunEntry({
        runAt: now.toISOString(),
        parentId: profile.parent.id,
        parentEmail: profile.parent.email,
        notificationFamily,
        source: "manual-resend",
        status: sendResult.sent ? "sent" : "skipped",
        reason: sendResult.reason ?? current.reason,
        deduped: sendResult.skipped,
        messageId: sendResult.messageId ?? null,
        errorMessage: null,
        trialEndsAt: null,
        invoiceId: current.invoiceId,
        invoiceStatus: current.invoiceStatus,
        reasonKey: null,
      });

      if (sendResult.sent) {
        await updateParentNotificationEmailState(profile.parent.email, {
          billingStatusNotificationLastSentAt: now.toISOString(),
          billingStatusNotificationLastInvoiceId: current.invoiceId,
          billingStatusNotificationLastInvoiceStatus: current.invoiceStatus,
          billingStatusNotificationLastResolvedAt: null,
          billingStatusNotificationLastResolvedInvoiceId: null,
          billingStatusNotificationLastResolvedInvoiceStatus: null,
        });
      }

      revalidateUserAdminPaths(profile.parent.id);
      return Response.json({
        success: sendResult.sent,
        action,
        notificationFamily,
        parentEmail,
        messageId: sendResult.messageId ?? null,
        reason: sendResult.reason ?? null,
      });
    }

    const current = getDeliverySupportNotificationCurrentState(profile, now);

    if (!current) {
      return conflict("No current delivery support notification state is available.");
    }

    if (action === "resolve") {
      await updateParentNotificationEmailState(profile.parent.email, {
        deliverySupportAlertLastResolvedAt: now.toISOString(),
        deliverySupportAlertLastResolvedReasonKey: current.reasonKey,
      });
      await createPlannedNotificationRunEntry({
        runAt: now.toISOString(),
        parentId: profile.parent.id,
        parentEmail: profile.parent.email,
        notificationFamily,
        source: "manual-resolve",
        status: "resolved",
        reason: current.reason,
        deduped: false,
        messageId: null,
        errorMessage: null,
        trialEndsAt: null,
        invoiceId: null,
        invoiceStatus: null,
        reasonKey: current.reasonKey,
      });
      revalidateUserAdminPaths(profile.parent.id);
      return Response.json({
        success: true,
        action,
        notificationFamily,
        parentEmail,
      });
    }

    const sendResult = await sendDeliverySupportAlertNotification({
      profile,
      reason: current.reason,
    });
    await createPlannedNotificationRunEntry({
      runAt: now.toISOString(),
      parentId: profile.parent.id,
      parentEmail: profile.parent.email,
      notificationFamily,
      source: "manual-resend",
      status: sendResult.sent ? "sent" : "skipped",
      reason: sendResult.reason ?? current.reason,
      deduped: sendResult.skipped,
      messageId: sendResult.messageId ?? null,
      errorMessage: null,
      trialEndsAt: null,
      invoiceId: null,
      invoiceStatus: null,
      reasonKey: current.reasonKey,
    });

    if (sendResult.sent) {
      await updateParentNotificationEmailState(profile.parent.email, {
        deliverySupportAlertLastNotifiedAt: now.toISOString(),
        deliverySupportAlertLastReasonKey: current.reasonKey,
        deliverySupportAlertLastResolvedAt: null,
        deliverySupportAlertLastResolvedReasonKey: null,
      });
    }

    revalidateUserAdminPaths(profile.parent.id);
    return Response.json({
      success: sendResult.sent,
      action,
      notificationFamily,
      parentEmail,
      messageId: sendResult.messageId ?? null,
      reason: sendResult.reason ?? null,
    });
  } catch (error) {
    const trialStatus = getTrialEndingNotificationStatus(profile, now);
    const billingStatus = getBillingStatusNotificationStatus(profile);
    const supportStatus = getDeliverySupportNotificationStatus(profile, now);
    const fallbackReason =
      notificationFamily === "trial-ending-reminder"
        ? trialStatus.detail
        : notificationFamily === "billing-status-update"
          ? billingStatus.detail
          : supportStatus.detail;

    await createPlannedNotificationRunEntry({
      runAt: now.toISOString(),
      parentId: profile.parent.id,
      parentEmail: profile.parent.email,
      notificationFamily,
      source: action === "resolve" ? "manual-resolve" : "manual-resend",
      status: "failed",
      reason: fallbackReason,
      deduped: false,
      messageId: null,
      errorMessage:
        error instanceof Error ? error.message : "The notification action failed.",
      trialEndsAt:
        notificationFamily === "trial-ending-reminder"
          ? profile.parent.trialEndsAt
          : null,
      invoiceId:
        notificationFamily === "billing-status-update"
          ? profile.parent.latestInvoiceId
          : null,
      invoiceStatus:
        notificationFamily === "billing-status-update"
          ? profile.parent.latestInvoiceStatus
          : null,
      reasonKey:
        notificationFamily === "delivery-support-alert"
          ? profile.parent.deliverySupportAlertLastReasonKey ?? null
          : null,
    });

    return conflict(
      error instanceof Error
        ? error.message
        : "This notification action could not be completed.",
    );
  }
}
