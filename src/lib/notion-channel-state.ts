import type { ParentProfile } from "./mvp-types";

export type NotionChannelState = {
  configured: boolean;
  verified: boolean;
  healthy: boolean;
};

export function getNotionChannelState(
  profile: Pick<ParentProfile, "parent" | "student">,
): NotionChannelState {
  const configured = Boolean(
    profile.parent.notionWorkspaceId &&
      profile.parent.notionDatabaseId &&
      profile.parent.notionDataSourceId,
  );
  const verified = configured && profile.student.notionConnected;
  const healthy =
    verified &&
    profile.parent.notionLastSyncStatus !== "failed" &&
    profile.parent.notionLastSyncStatus !== null;

  return {
    configured,
    verified,
    healthy,
  };
}
