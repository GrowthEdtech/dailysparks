import type {
  ParentProfile,
  SubscriptionPlan,
  SubscriptionStatus,
} from "../../../../lib/mvp-types";

export const USER_STATUS_FILTERS = [
  "trial",
  "active",
  "canceled",
  "free",
] as const;

export function isSubscriptionStatus(
  value: string | undefined,
): value is SubscriptionStatus {
  return USER_STATUS_FILTERS.includes(value as SubscriptionStatus);
}

export function getDerivedUserTypeLabel(status: SubscriptionStatus) {
  if (status === "active") {
    return "Active family";
  }

  if (status === "canceled") {
    return "Canceled family";
  }

  if (status === "free") {
    return "Free family";
  }

  return "Trial family";
}

export function getPlanLabel(plan: SubscriptionPlan) {
  if (plan === "yearly") {
    return "Yearly plan";
  }

  if (plan === "monthly") {
    return "Monthly plan";
  }

  return "No plan selected";
}

export function formatAdminDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
}

function formatInvoiceStatus(value: string | null) {
  if (!value) {
    return "No invoice yet";
  }

  return `Invoice ${value.replaceAll("_", " ").toLowerCase()}`;
}

export function getInvoiceStatusLabel(profile: ParentProfile) {
  return formatInvoiceStatus(profile.parent.latestInvoiceStatus);
}

export function getDeliveryLabels(profile: ParentProfile) {
  const labels: string[] = [];

  if (profile.student.goodnotesConnected) {
    labels.push("Goodnotes ready");
  }

  if (profile.student.notionConnected) {
    labels.push("Notion ready");
  }

  if (labels.length === 0) {
    labels.push("Delivery not ready");
  }

  return labels;
}

export function compareProfilesByCreatedAtDesc(
  left: ParentProfile,
  right: ParentProfile,
) {
  const leftTimestamp = Date.parse(left.parent.createdAt);
  const rightTimestamp = Date.parse(right.parent.createdAt);

  if (!Number.isNaN(leftTimestamp) && !Number.isNaN(rightTimestamp)) {
    return rightTimestamp - leftTimestamp;
  }

  return right.parent.createdAt.localeCompare(left.parent.createdAt);
}

export function countProfilesByStatus(profiles: ParentProfile[]) {
  return profiles.reduce<Record<SubscriptionStatus, number>>(
    (counts, profile) => ({
      ...counts,
      [profile.parent.subscriptionStatus]:
        counts[profile.parent.subscriptionStatus] + 1,
    }),
    {
      free: 0,
      trial: 0,
      active: 0,
      canceled: 0,
    },
  );
}
