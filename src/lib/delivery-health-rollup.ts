import {
  getGoodnotesChannelReadiness,
  getNotionChannelReadiness,
} from "./delivery-readiness";
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
  const readiness = getGoodnotesChannelReadiness(profile);

  if (readiness.healthy) {
    return {
      configured: readiness.configured,
      verified: readiness.verified,
      healthy: true,
      needsAttention: false,
      level: "healthy",
      label: "Goodnotes healthy",
    };
  }

  if (readiness.needsAttention) {
    return {
      configured: readiness.configured,
      verified: readiness.verified,
      healthy: false,
      needsAttention: true,
      level: "attention",
      label: "Goodnotes needs attention",
    };
  }

  if (readiness.verified) {
    return {
      configured: readiness.configured,
      verified: readiness.verified,
      healthy: false,
      needsAttention: false,
      level: "pending",
      label: "Goodnotes delivery check needed",
    };
  }

  if (readiness.configured) {
    return {
      configured: readiness.configured,
      verified: readiness.verified,
      healthy: false,
      needsAttention: false,
      level: "pending",
      label: "Goodnotes verification needed",
    };
  }

  return {
    configured: readiness.configured,
    verified: readiness.verified,
    healthy: false,
    needsAttention: false,
    level: "not_ready",
    label: "Goodnotes not ready",
  };
}

export function getNotionChannelRollup(
  profile: ParentProfile,
): DeliveryChannelRollup {
  const notionChannelState = getNotionChannelReadiness(profile);

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
      needsAttention: notionChannelState.needsAttention,
      level: notionChannelState.needsAttention ? "attention" : "pending",
      label: notionChannelState.needsAttention
        ? "Notion needs attention"
        : "Notion delivery check needed",
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
