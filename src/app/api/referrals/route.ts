import {
  clearSessionCookieHeader,
  getSessionEmailFromRequest,
} from "../../../lib/session";
import { getProfileByEmail } from "../../../lib/mvp-store";
import {
  createMarketingReferralInvite,
  recordMarketingReferralInviteDelivery,
} from "../../../lib/marketing-referral-store";
import { sendMarketingReferralInviteEmail } from "../../../lib/marketing-referral-email";
import type { MarketingLeadStageInterest } from "../../../lib/marketing-lead-store-types";

function unauthorized(message: string) {
  return Response.json(
    { message },
    {
      status: 401,
      headers: {
        "Set-Cookie": clearSessionCookieHeader(),
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

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStageInterest(value: unknown): MarketingLeadStageInterest {
  return value === "MYP" || value === "DP" ? value : "NOT_SURE";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  const sessionEmail = await getSessionEmailFromRequest(request);

  if (!sessionEmail) {
    return unauthorized("Please log in to continue.");
  }

  const profile = await getProfileByEmail(sessionEmail);

  if (!profile) {
    return unauthorized("Your session has expired. Please log in again.");
  }

  if (!profile.parent.firstBriefDeliveredAt) {
    return conflict(
      "Referral invites unlock after your family has received the first brief.",
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        inviteeEmail?: string;
        inviteeFullName?: string;
        inviteeStageInterest?: string;
      }
    | null;

  const inviteeEmail = normalizeString(body?.inviteeEmail).toLowerCase();

  if (!inviteeEmail || !isValidEmail(inviteeEmail)) {
    return badRequest("Please enter a valid parent email.");
  }

  const invite = await createMarketingReferralInvite({
    referrerParentId: profile.parent.id,
    referrerParentEmail: profile.parent.email,
    referrerParentFullName: profile.parent.fullName,
    inviteeEmail,
    inviteeFullName: normalizeString(body?.inviteeFullName),
    inviteeStageInterest: normalizeStageInterest(body?.inviteeStageInterest),
    sourcePath: "/dashboard",
  });

  const delivery = await sendMarketingReferralInviteEmail({
    invite,
  }).catch((error) => ({
    sent: false,
    skipped: false,
    reason:
      error instanceof Error && error.message.trim()
        ? error.message
        : "Referral invite delivery failed.",
  }));
  const deliveryStatus = delivery.sent ? "sent" : delivery.skipped ? "skipped" : "failed";
  const messageId = "messageId" in delivery ? delivery.messageId ?? null : null;

  await recordMarketingReferralInviteDelivery({
    inviteId: invite.id,
    status: deliveryStatus,
    messageId: deliveryStatus === "sent" ? messageId : null,
    errorMessage: deliveryStatus === "sent" ? null : delivery.reason,
  });

  return Response.json({
    inviteId: invite.id,
    referrerParentId: profile.parent.id,
    deliveryStatus,
    message: deliveryStatus === "sent"
      ? "Your referral invite is on the way."
      : deliveryStatus === "skipped"
        ? "Your referral invite was saved, but email delivery is not configured yet."
        : "Your referral invite was saved, but email delivery failed.",
  });
}
