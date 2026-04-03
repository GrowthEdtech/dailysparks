import type { ParentProfile } from "./mvp-types";

export const DAILY_BRIEF_DISPATCH_MODES = ["all", "canary"] as const;
export type DailyBriefDispatchMode =
  (typeof DAILY_BRIEF_DISPATCH_MODES)[number];

export type DailyBriefDispatchPlan = {
  mode: DailyBriefDispatchMode;
  canaryParentEmails: string[];
  selectedProfiles: ParentProfile[];
  skippedProfiles: ParentProfile[];
};

export type DailyBriefDispatchOverrides = {
  mode?: DailyBriefDispatchMode;
  canaryParentEmails?: string[];
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function getDailyBriefDispatchMode(): DailyBriefDispatchMode {
  return process.env.DAILY_BRIEF_DELIVERY_MODE === "canary" ? "canary" : "all";
}

export function getDailyBriefCanaryParentEmails() {
  const raw = process.env.DAILY_BRIEF_CANARY_PARENT_EMAILS ?? "";

  return raw
    .split(",")
    .map((value) => normalizeEmail(value))
    .filter(Boolean);
}

export function planDailyBriefDispatch(
  profiles: ParentProfile[],
  overrides: DailyBriefDispatchOverrides = {},
): DailyBriefDispatchPlan {
  const mode = overrides.mode ?? getDailyBriefDispatchMode();

  if (mode === "all") {
    return {
      mode,
      canaryParentEmails: [],
      selectedProfiles: [...profiles],
      skippedProfiles: [],
    };
  }

  const canaryParentEmails =
    overrides.canaryParentEmails?.map((value) => normalizeEmail(value)).filter(Boolean) ??
    getDailyBriefCanaryParentEmails();
  const canaryEmailSet = new Set(canaryParentEmails);
  const selectedProfiles = profiles.filter((profile) =>
    canaryEmailSet.has(normalizeEmail(profile.parent.email)),
  );
  const skippedProfiles = profiles.filter(
    (profile) => !canaryEmailSet.has(normalizeEmail(profile.parent.email)),
  );

  return {
    mode,
    canaryParentEmails,
    selectedProfiles,
    skippedProfiles,
  };
}
