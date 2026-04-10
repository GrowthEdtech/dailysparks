import {
  clearSessionCookieHeader,
  getSessionEmailFromRequest,
} from "../../../../lib/session";
import { getProfileByEmail } from "../../../../lib/mvp-store";
import { listMarketingReferralInvites } from "../../../../lib/marketing-referral-store";
import type { DashboardReferralData } from "../../../../lib/dashboard-referral-data-schema";

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

export async function GET(request: Request) {
  const sessionEmail = await getSessionEmailFromRequest(request);

  if (!sessionEmail) {
    return unauthorized("Please log in to continue.");
  }

  const profile = await getProfileByEmail(sessionEmail);

  if (!profile) {
    return unauthorized("Your session has expired. Please log in again.");
  }

  const invites = (await listMarketingReferralInvites({ limit: 500 })).filter(
    (invite) =>
      invite.referrerParentId === profile.parent.id ||
      invite.referrerParentEmail === profile.parent.email,
  );
  const recentInvites = [...invites]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 5);

  const payload: DashboardReferralData = {
    summary: {
      sentCount: invites.filter((invite) => invite.deliveryStatus === "sent").length,
      acceptedCount: invites.filter((invite) => Boolean(invite.acceptedAt)).length,
      trialStartedCount: invites.filter((invite) => Boolean(invite.trialStartedAt))
        .length,
    },
    recentInvites,
  };

  return Response.json(payload);
}
