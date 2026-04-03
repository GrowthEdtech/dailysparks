import { getNotionChannelReadiness } from "./delivery-readiness";
import type { ParentProfile } from "./mvp-types";

export type NotionChannelState = {
  configured: boolean;
  verified: boolean;
  healthy: boolean;
  dispatchable: boolean;
  retryable: boolean;
  needsAttention: boolean;
  stage:
    | "not_ready"
    | "configured"
    | "verified"
    | "healthy"
    | "attention";
};

export function getNotionChannelState(
  profile: Pick<ParentProfile, "parent" | "student">,
): NotionChannelState {
  return getNotionChannelReadiness(profile);
}
