import type { ParentProfile } from "../../../lib/mvp-types";
import {
  getOrCreateParentProfile,
  getProfileByEmail,
  updateParentAcquisitionSnapshot,
} from "../../../lib/mvp-store";
import { listMarketingLeads } from "../../../lib/marketing-lead-store";
import { markMarketingReferralTrialStarted } from "../../../lib/marketing-referral-store";
import { listMarketingReferralInvites } from "../../../lib/marketing-referral-store";
import { createSessionFromIdToken } from "../../../lib/session";

type LoginRequestBody = {
  idToken?: unknown;
};

function badRequest(message: string) {
  return Response.json({ message }, { status: 400 });
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function hasAcquisitionSnapshot(profile: ParentProfile) {
  return Boolean(profile.parent.acquisitionSource);
}

function getAcquisitionCapturedAt(profile: ParentProfile) {
  return (
    profile.parent.acquisitionCapturedAt ??
    profile.parent.firstAuthenticatedAt ??
    profile.parent.trialStartedAt ??
    new Date().toISOString()
  );
}

function getAcceptedInviteTimestamp(acceptedAt: string | null, updatedAt: string) {
  return acceptedAt ?? updatedAt;
}

async function persistAcquisitionSnapshot(profile: ParentProfile) {
  if (hasAcquisitionSnapshot(profile)) {
    return profile;
  }

  const capturedAt = getAcquisitionCapturedAt(profile);
  const acceptedInvite = (
    await listMarketingReferralInvites({
      inviteeEmail: profile.parent.email,
      limit: 25,
    })
  )
    .filter((invite) => Boolean(invite.acceptedAt))
    .sort((left, right) =>
      getAcceptedInviteTimestamp(right.acceptedAt, right.updatedAt).localeCompare(
        getAcceptedInviteTimestamp(left.acceptedAt, left.updatedAt),
      ),
    )[0];

  if (acceptedInvite) {
    return (
      (await updateParentAcquisitionSnapshot(profile.parent.email, {
        acquisitionSource: "referral",
        acquisitionCapturedAt: capturedAt,
        acquisitionLeadId: null,
        acquisitionReferralInviteId: acceptedInvite.id,
        acquisitionPagePath: acceptedInvite.sourcePath,
        acquisitionReferrerUrl: null,
        acquisitionUtmSource: null,
        acquisitionUtmMedium: null,
        acquisitionUtmCampaign: null,
        acquisitionUtmContent: null,
        acquisitionUtmTerm: null,
      })) ?? profile
    );
  }

  const lead = (
    await listMarketingLeads({
      email: profile.parent.email,
      source: "ib-parent-starter-kit",
      limit: 25,
    })
  ).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];

  if (lead) {
    return (
      (await updateParentAcquisitionSnapshot(profile.parent.email, {
        acquisitionSource: "starter-kit",
        acquisitionCapturedAt: capturedAt,
        acquisitionLeadId: lead.id,
        acquisitionReferralInviteId: null,
        acquisitionPagePath: lead.pagePath,
        acquisitionReferrerUrl: lead.referrerUrl,
        acquisitionUtmSource: lead.utmSource,
        acquisitionUtmMedium: lead.utmMedium,
        acquisitionUtmCampaign: lead.utmCampaign,
        acquisitionUtmContent: lead.utmContent,
        acquisitionUtmTerm: lead.utmTerm,
      })) ?? profile
    );
  }

  return (
    (await updateParentAcquisitionSnapshot(profile.parent.email, {
      acquisitionSource: "direct",
      acquisitionCapturedAt: capturedAt,
      acquisitionLeadId: null,
      acquisitionReferralInviteId: null,
      acquisitionPagePath: null,
      acquisitionReferrerUrl: null,
      acquisitionUtmSource: null,
      acquisitionUtmMedium: null,
      acquisitionUtmCampaign: null,
      acquisitionUtmContent: null,
      acquisitionUtmTerm: null,
    })) ?? profile
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as LoginRequestBody | null;

  if (!body) {
    return badRequest("Please submit a valid request body.");
  }

  const idToken = normalizeString(body.idToken);

  if (!idToken) {
    return badRequest("Please continue with Google to sign in.");
  }

  let session;

  try {
    session = await createSessionFromIdToken(idToken);
  } catch (error) {
    console.error("login route: failed to create Firebase session", error);

    return Response.json(
      {
        message:
          "Google sign-in succeeded, but Daily Sparks could not create a secure session. Please try again.",
      },
      { status: 401 },
    );
  }

  try {
    const existingProfile = await getProfileByEmail(session.identity.email);
    const profile = await getOrCreateParentProfile({
      email: session.identity.email,
      fullName: session.identity.name,
      studentName: existingProfile?.student.studentName,
    });
    const profileWithAcquisitionSnapshot = await persistAcquisitionSnapshot(profile);
    await markMarketingReferralTrialStarted({
      inviteeEmail: session.identity.email,
      inviteeParentId: profile.parent.id,
    }).catch(() => null);

    return Response.json(profileWithAcquisitionSnapshot, {
      status: 200,
      headers: {
        "Set-Cookie": session.cookieHeader,
      },
    });
  } catch (error) {
    console.error("login route: failed to load or create parent profile", error);

    return Response.json(
      {
        message:
          "Google sign-in succeeded, but Daily Sparks could not load your parent profile. Please try again.",
      },
      { status: 503 },
    );
  }
}
