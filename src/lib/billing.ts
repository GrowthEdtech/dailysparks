import type {
  ParentRecord,
  SubscriptionPlan,
  SubscriptionStatus,
} from "./mvp-types";

type BillingSummaryRow = {
  label: string;
  value: string;
};

type InvoiceSummary = {
  title: string;
  subtitle: string;
  statusLabel: string;
  recipientEmail: string;
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
  rows: BillingSummaryRow[];
};

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

export function getSubscriptionPlanBadgeLabel(parent: ParentRecord) {
  if (!parent.subscriptionPlan || parent.subscriptionStatus === "active") {
    return null;
  }

  return parent.subscriptionPlan === "yearly" ? "Yearly chosen" : "Monthly chosen";
}

function formatDate(value: string | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatCurrencyAmount(amount: number | null, currency: string | null) {
  if (amount === null || !currency) {
    return "";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatInvoiceStatus(status: string | null) {
  if (!status) {
    return "Invoice recorded";
  }

  if (status === "paid") {
    return "Paid";
  }

  return status
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatBillingPeriod(start: string | null, end: string | null) {
  if (!start || !end) {
    return "";
  }

  return `${formatDate(start)} - ${formatDate(end)}`;
}

export function getLatestInvoiceSummary(parent: ParentRecord): InvoiceSummary | null {
  if (!parent.latestInvoiceId) {
    return null;
  }

  const formattedAmount = formatCurrencyAmount(
    parent.latestInvoiceAmountPaid,
    parent.latestInvoiceCurrency,
  );
  const formattedPeriod = formatBillingPeriod(
    parent.latestInvoicePeriodStart,
    parent.latestInvoicePeriodEnd,
  );
  const rows: BillingSummaryRow[] = [];

  if (parent.latestInvoiceNumber) {
    rows.push({
      label: "Invoice number",
      value: parent.latestInvoiceNumber,
    });
  }

  rows.push({
    label: "Sent to",
    value: parent.email,
  });

  if (parent.latestInvoicePaidAt) {
    rows.push({
      label: "Paid on",
      value: formatDate(parent.latestInvoicePaidAt),
    });
  }

  if (formattedAmount) {
    rows.push({
      label: parent.latestInvoiceStatus === "paid" ? "Amount paid" : "Invoice amount",
      value: formattedAmount,
    });
  }

  if (formattedPeriod) {
    rows.push({
      label: "Billing period",
      value: formattedPeriod,
    });
  }

  return {
    title: "Latest invoice",
    subtitle: `Stripe emails each paid invoice to ${parent.email}.`,
    statusLabel: formatInvoiceStatus(parent.latestInvoiceStatus),
    recipientEmail: parent.email,
    hostedInvoiceUrl: parent.latestInvoiceHostedUrl,
    invoicePdfUrl: parent.latestInvoicePdfUrl,
    rows,
  };
}

export function getBillingSummary(parent: ParentRecord) {
  const statusLabel = formatStatus(parent.subscriptionStatus);
  const planName = formatPlanName(parent.subscriptionPlan);
  const summary = {
    title: `${statusLabel} access`,
    subtitle: "Your 7-day trial starts the first time you sign in to Daily Sparks.",
    detail:
      "Choose monthly or yearly billing before trial ends. Linking Goodnotes or Notion does not change your billing dates.",
    statusLabel,
    summaryRows: [
      {
        label: "Trial started on",
        value: formatDate(parent.trialStartedAt),
      },
      {
        label: "Trial ends on",
        value: formatDate(parent.trialEndsAt),
      },
    ] as BillingSummaryRow[],
  };

  if (parent.subscriptionStatus === "active" && parent.subscriptionPlan) {
    return {
      title: `${planName} plan active`,
      subtitle: "Your subscription is active and connected to your parent workspace.",
      detail: parent.stripeCustomerId
        ? "Use the Stripe billing portal to switch cadence or cancel your subscription."
        : "Your Stripe subscription is active and ready for reading delivery.",
      statusLabel,
      summaryRows: [
        ...(parent.subscriptionActivatedAt
          ? [
              {
                label: "Active since",
                value: formatDate(parent.subscriptionActivatedAt),
              },
            ]
          : []),
        ...(parent.subscriptionRenewalAt
          ? [
              {
                label: "Renews on",
                value: formatDate(parent.subscriptionRenewalAt),
              },
            ]
          : []),
      ],
    };
  }

  if (parent.subscriptionPlan) {
    return {
      title: "Trial access",
      subtitle: `${planName} plan chosen for your account.`,
      detail:
        "Complete Stripe checkout before trial ends to activate this subscription.",
      statusLabel,
      summaryRows: [
        {
          label: "Trial started on",
          value: formatDate(parent.trialStartedAt),
        },
        {
          label: "Trial ends on",
          value: formatDate(parent.trialEndsAt),
        },
      ],
    };
  }

  return summary;
}
