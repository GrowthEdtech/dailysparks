import type { Programme, ParentProfile } from "./mvp-types";

export const DELIVERY_READINESS_STAGES = [
  "not_ready",
  "configured",
  "verified",
  "healthy",
  "attention",
] as const;

export type DeliveryReadinessStage =
  (typeof DELIVERY_READINESS_STAGES)[number];

export type DeliveryChannelReadiness = {
  configured: boolean;
  verified: boolean;
  healthy: boolean;
  dispatchable: boolean;
  retryable: boolean;
  needsAttention: boolean;
  stage: DeliveryReadinessStage;
};

function buildChannelReadiness(input: {
  configured: boolean;
  verified: boolean;
  healthy: boolean;
  needsAttention: boolean;
}): DeliveryChannelReadiness {
  const { configured, verified, healthy, needsAttention } = input;

  return {
    configured,
    verified,
    healthy,
    dispatchable: healthy,
    retryable: verified,
    needsAttention,
    stage: healthy
      ? "healthy"
      : needsAttention
        ? "attention"
        : verified
          ? "verified"
          : configured
            ? "configured"
            : "not_ready",
  };
}

export function getGoodnotesChannelReadiness(
  profile: Pick<ParentProfile, "student">,
): DeliveryChannelReadiness {
  const configured = Boolean(profile.student.goodnotesEmail);
  const verified = profile.student.goodnotesConnected;
  const healthy =
    verified && profile.student.goodnotesLastDeliveryStatus === "success";
  const needsAttention =
    verified && profile.student.goodnotesLastDeliveryStatus === "failed";

  return buildChannelReadiness({
    configured,
    verified,
    healthy,
    needsAttention,
  });
}

export function getNotionChannelReadiness(
  profile: Pick<ParentProfile, "parent" | "student">,
): DeliveryChannelReadiness {
  const configured = Boolean(
    profile.parent.notionWorkspaceId &&
      profile.parent.notionDatabaseId &&
      profile.parent.notionDataSourceId,
  );
  const verified = configured && profile.student.notionConnected;
  const healthy =
    verified && profile.parent.notionLastSyncStatus === "success";
  const needsAttention =
    verified && profile.parent.notionLastSyncStatus === "failed";

  return buildChannelReadiness({
    configured,
    verified,
    healthy,
    needsAttention,
  });
}

export function getDeliveryChannelReadiness(
  profile: ParentProfile,
  channel: "goodnotes" | "notion",
) {
  return channel === "goodnotes"
    ? getGoodnotesChannelReadiness(profile)
    : getNotionChannelReadiness(profile);
}

export function hasDispatchableDeliveryChannel(profile: ParentProfile) {
  return (
    getGoodnotesChannelReadiness(profile).dispatchable ||
    getNotionChannelReadiness(profile).dispatchable
  );
}

export function hasRetryableDeliveryChannel(profile: ParentProfile) {
  return (
    getGoodnotesChannelReadiness(profile).retryable ||
    getNotionChannelReadiness(profile).retryable
  );
}

export function canDispatchDeliveryChannel(
  profile: ParentProfile,
  channel: "goodnotes" | "notion",
) {
  return getDeliveryChannelReadiness(profile, channel).dispatchable;
}

export function canRetryDeliveryChannel(
  profile: ParentProfile,
  channel: "goodnotes" | "notion",
) {
  return getDeliveryChannelReadiness(profile, channel).retryable;
}

export function filterDispatchableProfilesByProgramme(
  profiles: ParentProfile[],
  programme: Programme,
) {
  return profiles.filter(
    (profile) =>
      profile.student.programme === programme &&
      hasDispatchableDeliveryChannel(profile),
  );
}

export function filterRetryableProfilesByProgramme(
  profiles: ParentProfile[],
  programme: Programme,
) {
  return profiles.filter(
    (profile) =>
      profile.student.programme === programme &&
      hasRetryableDeliveryChannel(profile),
  );
}
