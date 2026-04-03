import { getNotionChannelState } from "./notion-channel-state";
import type {
  DailyBriefDeliveryChannel,
  DailyBriefDeliveryReceipt,
  DailyBriefFailedDeliveryTarget,
} from "./daily-brief-history-schema";
import type { ParentProfile } from "./mvp-types";

type DeliveryTargetIdentity = {
  parentId: string;
  parentEmail: string;
  channel: DailyBriefDeliveryChannel;
};

function buildTargetKey(target: DeliveryTargetIdentity) {
  return `${target.parentId}:${target.channel}`;
}

export function listExpectedDeliveryTargets(
  profiles: ParentProfile[],
): DeliveryTargetIdentity[] {
  return profiles.flatMap((profile) => {
    const targets: DeliveryTargetIdentity[] = [];

    if (profile.student.goodnotesConnected) {
      targets.push({
        parentId: profile.parent.id,
        parentEmail: profile.parent.email,
        channel: "goodnotes",
      });
    }

    if (getNotionChannelState(profile).verified) {
      targets.push({
        parentId: profile.parent.id,
        parentEmail: profile.parent.email,
        channel: "notion",
      });
    }

    return targets;
  });
}

export function listPendingDeliveryTargets(input: {
  profiles: ParentProfile[];
  deliveryReceipts: DailyBriefDeliveryReceipt[];
  failedDeliveryTargets: DailyBriefFailedDeliveryTarget[];
}) {
  const successfulKeys = new Set(
    input.deliveryReceipts.map((receipt) => buildTargetKey(receipt)),
  );
  const failedKeys = new Set(
    input.failedDeliveryTargets.map((target) => buildTargetKey(target)),
  );

  return listExpectedDeliveryTargets(input.profiles).filter((target) => {
    const key = buildTargetKey(target);

    return !successfulKeys.has(key) && !failedKeys.has(key);
  });
}
