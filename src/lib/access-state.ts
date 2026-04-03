import type { ParentRecord } from "./mvp-types";

export const DERIVED_ACCESS_STATES = [
  "active",
  "trial_active",
  "trial_expired",
  "canceled",
  "free",
] as const;

export type DerivedAccessState = (typeof DERIVED_ACCESS_STATES)[number];

type AccessStateInput =
  | DerivedAccessState
  | Pick<ParentRecord, "subscriptionStatus" | "trialEndsAt">;

function isDerivedAccessState(value: string): value is DerivedAccessState {
  return DERIVED_ACCESS_STATES.includes(value as DerivedAccessState);
}

function normalizeInput(
  input: AccessStateInput,
  now = new Date(),
): DerivedAccessState {
  if (typeof input === "string" && isDerivedAccessState(input)) {
    return input;
  }

  if (input.subscriptionStatus === "active") {
    return "active";
  }

  if (input.subscriptionStatus === "canceled") {
    return "canceled";
  }

  if (input.subscriptionStatus === "free") {
    return "free";
  }

  const trialEndsAt = Date.parse(input.trialEndsAt);

  if (Number.isNaN(trialEndsAt)) {
    return "trial_expired";
  }

  return trialEndsAt > now.getTime() ? "trial_active" : "trial_expired";
}

export function getDerivedAccessState(
  parent: Pick<ParentRecord, "subscriptionStatus" | "trialEndsAt">,
  now = new Date(),
) {
  return normalizeInput(parent, now);
}

export function getEffectiveAccessStatusLabel(
  input: AccessStateInput,
  now = new Date(),
) {
  switch (normalizeInput(input, now)) {
    case "active":
      return "Active";
    case "trial_active":
      return "Trial";
    case "trial_expired":
      return "Trial expired";
    case "canceled":
      return "Canceled";
    case "free":
      return "Free";
  }
}

export function getDerivedUserTypeLabel(
  input: AccessStateInput,
  now = new Date(),
) {
  switch (normalizeInput(input, now)) {
    case "active":
      return "Active family";
    case "trial_active":
      return "Trial family";
    case "trial_expired":
      return "Trial expired family";
    case "canceled":
      return "Canceled family";
    case "free":
      return "Free family";
  }
}

export function getDerivedAccessStateFilterLabel(state: DerivedAccessState) {
  switch (state) {
    case "active":
      return "Active";
    case "trial_active":
      return "In trial";
    case "trial_expired":
      return "Trial expired";
    case "canceled":
      return "Canceled";
    case "free":
      return "Free";
  }
}

export function isDerivedAccessStateFilter(
  value: string | undefined,
): value is DerivedAccessState {
  return typeof value === "string" && isDerivedAccessState(value);
}
