import type {
  ParentRecord,
  SubscriptionPlan,
  SubscriptionStatus,
} from "./mvp-types";

export const BILLING_PLAN_DEFINITIONS = [
  {
    id: "monthly",
    name: "Monthly",
    price: "$15",
    cadence: "/ month",
    eyebrow: "Flexible access",
    description: "Keep Daily Sparks on a month-to-month rhythm with full dashboard access.",
    bullets: [
      "Full Daily Sparks reading flow",
      "GoodNotes delivery support",
      "Cancel anytime from billing",
    ],
    cta: "Select monthly",
  },
  {
    id: "yearly",
    name: "Yearly",
    price: "$144",
    cadence: "/ year",
    eyebrow: "Best value",
    description: "Commit to a full year and save 20% versus paying monthly.",
    bullets: [
      "Everything in Monthly",
      "12 months of IB reading support",
      "Effective $12 / month pricing",
    ],
    cta: "Select yearly",
  },
] as const;

function formatPlanName(plan: SubscriptionPlan) {
  if (plan === "monthly") {
    return "Monthly";
  }

  if (plan === "yearly") {
    return "Yearly";
  }

  return "No plan selected";
}

function formatStatus(status: SubscriptionStatus) {
  if (status === "active") {
    return "Active";
  }

  if (status === "canceled") {
    return "Canceled";
  }

  if (status === "free") {
    return "Free";
  }

  return "Trial";
}

export function getBillingSummary(parent: ParentRecord) {
  const statusLabel = formatStatus(parent.subscriptionStatus);
  const planName = formatPlanName(parent.subscriptionPlan);

  if (parent.subscriptionStatus === "active" && parent.subscriptionPlan) {
    return {
      title: `${planName} plan active`,
      subtitle: "Billing is active and connected to your parent workspace.",
      detail: "You can review or switch your billing cadence at any time.",
      statusLabel,
    };
  }

  if (parent.subscriptionPlan) {
    return {
      title: `${statusLabel} access`,
      subtitle: `${planName} billing is selected for your account.`,
      detail: "This MVP saves your billing choice now and checkout will connect next.",
      statusLabel,
    };
  }

  return {
    title: `${statusLabel} access`,
    subtitle: "Choose monthly or yearly billing to complete your setup.",
    detail: "Your selection will appear here once billing is configured.",
    statusLabel,
  };
}
