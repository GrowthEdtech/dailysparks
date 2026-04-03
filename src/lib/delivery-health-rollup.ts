import { getNotionChannelState } from "./notion-channel-state";
import type { ParentProfile } from "./mvp-types";

export type DeliveryHealthLevel =
  | "healthy"
  | "attention"
  | "pending"
  | "not_ready";

export type DeliveryChannelRollup = {
  configured: boolean;
  verified: boolean;
  healthy: boolean;
  needsAttention: boolean;
  level: DeliveryHealthLevel;
  label: string;
};

export type FamilyDeliveryHealthRollup = {
  overall: DeliveryHealthLevel;
  labels: string[];
  goodnotes: DeliveryChannelRollup;
  notion: DeliveryChannelRollup;
};

export function getGoodnotesChannelRollup(
  profile: ParentProfile,
): DeliveryChannelRollup {
  const configured = Boolean(profile.student.goodnotesEmail);
  const verified = profile.student.goodnotesConnected;
  const lastStatus = profile.student.goodnotesLastDeliveryStatus;
  const healthy = verified && lastStatus === "success";
  const needsAttention = verified && lastStatus === "failed";

  if (healthy) {
    return {
      configured,
      verified,
      healthy: true,
      needsAttention: false,
      level: "healthy",
      label: "Goodnotes healthy",
    };
  }

  if (needsAttention) {
    return {
      configured,
      verified,
      healthy: false,
      needsAttention: true,
      level: "attention",
      label: "Goodnotes needs attention",
    };
  }

  if (verified) {
    return {
      configured,
      verified,
      healthy: false,
      needsAttention: false,
      level: "pending",
      label: "Goodnotes ready",
    };
  }

  if (configured) {
    return {
      configured,
      verified,
      healthy: false,
      needsAttention: false,
      level: "pending",
      label: "Goodnotes verification needed",
    };
  }

  return {
    configured,
    verified,
    healthy: false,
    needsAttention: false,
    level: "not_ready",
    label: "Goodnotes not ready",
  };
}

export function getNotionChannelRollup(
  profile: ParentProfile,
): DeliveryChannelRollup {
  const notionChannelState = getNotionChannelState(profile);

  if (notionChannelState.healthy) {
    return {
      configured: true,
      verified: true,
      healthy: true,
      needsAttention: false,
      level: "healthy",
      label: "Notion healthy",
    };
  }

  if (notionChannelState.verified) {
    return {
      configured: true,
      verified: true,
      healthy: false,
      needsAttention: true,
      level: "attention",
      label: "Notion needs attention",
    };
  }

  if (notionChannelState.configured) {
    return {
      configured: true,
      verified: false,
      healthy: false,
      needsAttention: false,
      level: "pending",
      label: "Notion verification needed",
    };
  }

  return {
    configured: false,
    verified: false,
    healthy: false,
    needsAttention: false,
    level: "not_ready",
    label: "Notion not ready",
  };
}

function deriveOverallLevel(channels: DeliveryChannelRollup[]): DeliveryHealthLevel {
  if (channels.some((channel) => channel.level === "attention")) {
    return "attention";
  }

  if (channels.some((channel) => channel.level === "healthy")) {
    return "healthy";
  }

  if (channels.some((channel) => channel.level === "pending")) {
    return "pending";
  }

  return "not_ready";
}

export function getFamilyDeliveryHealthRollup(
  profile: ParentProfile,
): FamilyDeliveryHealthRollup {
  const goodnotes = getGoodnotesChannelRollup(profile);
  const notion = getNotionChannelRollup(profile);
  const channels = [goodnotes, notion];
  const labels = channels
    .filter((channel) => channel.level !== "not_ready")
    .map((channel) => channel.label);

  return {
    overall: deriveOverallLevel(channels),
    labels: labels.length > 0 ? labels : ["Delivery not ready"],
    goodnotes,
    notion,
  };
}
