import Stripe from "stripe";

import type {
  ParentProfile,
  ParentRecord,
  SubscriptionStatus,
  UpdateParentSubscriptionInput,
} from "./mvp-types";
import { getProfileByEmail, updateParentSubscription } from "./mvp-store";

export type StripeBillingBackfillResult = {
  dryRun: boolean;
  email: string;
  foundLatestInvoice: boolean;
  foundStripeSubscription: boolean;
  latestInvoiceId: string | null;
  skippedReason: string | null;
  stripeSubscriptionId: string | null;
  update: UpdateParentSubscriptionInput | null;
  updatedProfile: ParentProfile | null;
};

type StripeBackfillUpdateInput = {
  latestInvoice: Stripe.Invoice | null;
  parent: ParentRecord;
  subscription: Stripe.Subscription | null;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeNullableString(value: string | null | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toIsoTimestamp(value: number | null | undefined) {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

function inferPlanFromInterval(interval: string | null | undefined) {
  if (interval === "month") {
    return "monthly" as const;
  }

  if (interval === "year") {
    return "yearly" as const;
  }

  return null;
}

function inferPlanFromSubscription(
  subscription: Stripe.Subscription | null | undefined,
) {
  const interval = subscription?.items.data[0]?.price?.recurring?.interval ?? null;

  return inferPlanFromInterval(interval);
}

function getInvoicePeriod(invoice: Stripe.Invoice) {
  const periodLine = invoice.lines.data.find(
    (line) => typeof line.period?.start === "number" && typeof line.period?.end === "number",
  );

  return {
    periodEnd: toIsoTimestamp(periodLine?.period?.end ?? null),
    periodStart: toIsoTimestamp(periodLine?.period?.start ?? null),
  };
}

function getInvoiceAmountForSummary(invoice: Stripe.Invoice) {
  if (invoice.status === "paid") {
    return invoice.amount_paid;
  }

  if (typeof invoice.amount_due === "number" && invoice.amount_due > 0) {
    return invoice.amount_due;
  }

  return typeof invoice.total === "number" ? invoice.total : null;
}

function getInvoiceSummaryUpdate(invoice: Stripe.Invoice): UpdateParentSubscriptionInput {
  const { periodEnd, periodStart } = getInvoicePeriod(invoice);

  return {
    latestInvoiceAmountPaid: getInvoiceAmountForSummary(invoice),
    latestInvoiceCurrency: normalizeNullableString(invoice.currency),
    latestInvoiceHostedUrl: normalizeNullableString(invoice.hosted_invoice_url),
    latestInvoiceId: invoice.id,
    latestInvoiceNumber: normalizeNullableString(invoice.number),
    latestInvoicePaidAt: toIsoTimestamp(invoice.status_transitions?.paid_at ?? null),
    latestInvoicePdfUrl: normalizeNullableString(invoice.invoice_pdf),
    latestInvoicePeriodEnd: periodEnd,
    latestInvoicePeriodStart: periodStart,
    latestInvoiceStatus: normalizeNullableString(invoice.status),
  };
}

function getSubscriptionStatusFromStripeStatus(
  status: Stripe.Subscription.Status,
): SubscriptionStatus | null {
  if (status === "active") {
    return "active";
  }

  if (status === "trialing") {
    return "trial";
  }

  if (status === "canceled" || status === "unpaid" || status === "incomplete_expired") {
    return "canceled";
  }

  return null;
}

function getStripeCustomerIdFromSubscription(
  subscription: Stripe.Subscription | null,
) {
  if (!subscription) {
    return null;
  }

  return typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer?.id ?? null;
}

function getStripeCustomerIdFromInvoice(invoice: Stripe.Invoice | null) {
  if (!invoice) {
    return null;
  }

  return typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;
}

function getStripeSubscriptionIdFromInvoice(invoice: Stripe.Invoice | null) {
  if (!invoice) {
    return null;
  }

  const invoiceSubscription = invoice.parent?.subscription_details?.subscription ?? null;

  if (typeof invoiceSubscription === "string") {
    return invoiceSubscription;
  }

  if (invoiceSubscription && typeof invoiceSubscription === "object" && "id" in invoiceSubscription) {
    return typeof invoiceSubscription.id === "string" ? invoiceSubscription.id : null;
  }

  return null;
}

function getSubscriptionStatusPriority(status: Stripe.Subscription.Status) {
  switch (status) {
    case "active":
      return 7;
    case "trialing":
      return 6;
    case "past_due":
      return 5;
    case "unpaid":
      return 4;
    case "incomplete":
      return 3;
    case "paused":
      return 2;
    case "canceled":
      return 1;
    default:
      return 0;
  }
}

export function selectStripeBackfillSubscription(
  subscriptions: Stripe.Subscription[],
) {
  if (subscriptions.length === 0) {
    return null;
  }

  const ranked = subscriptions.toSorted((left, right) => {
    const priorityDelta =
      getSubscriptionStatusPriority(right.status) - getSubscriptionStatusPriority(left.status);

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    const rightPeriodEnd = right.items.data[0]?.current_period_end ?? right.created;
    const leftPeriodEnd = left.items.data[0]?.current_period_end ?? left.created;

    return rightPeriodEnd - leftPeriodEnd;
  });

  return ranked[0] ?? null;
}

export function getStripeBackfillUpdate(
  input: StripeBackfillUpdateInput,
): UpdateParentSubscriptionInput {
  const { latestInvoice, parent, subscription } = input;
  const subscriptionPlan =
    inferPlanFromSubscription(subscription) ?? parent.subscriptionPlan ?? null;
  const subscriptionStatus = subscription
    ? getSubscriptionStatusFromStripeStatus(subscription.status)
    : null;
  const stripeCustomerId =
    getStripeCustomerIdFromSubscription(subscription) ??
    getStripeCustomerIdFromInvoice(latestInvoice) ??
    parent.stripeCustomerId;
  const stripeSubscriptionId =
    subscription?.id ?? getStripeSubscriptionIdFromInvoice(latestInvoice) ?? parent.stripeSubscriptionId;
  const invoicePaidAt =
    latestInvoice
      ? toIsoTimestamp(latestInvoice.status_transitions?.paid_at ?? null) ??
        toIsoTimestamp(latestInvoice.created)
      : null;
  const subscriptionStartedAt =
    subscription && (subscription.status === "active" || subscription.status === "trialing")
      ? toIsoTimestamp(subscription.start_date)
      : null;
  const update: UpdateParentSubscriptionInput = {};

  if (subscriptionPlan) {
    update.subscriptionPlan = subscriptionPlan;
  }

  if (subscriptionStatus) {
    update.subscriptionStatus = subscriptionStatus;
  }

  if (stripeCustomerId !== undefined) {
    update.stripeCustomerId = stripeCustomerId;
  }

  if (stripeSubscriptionId !== undefined) {
    update.stripeSubscriptionId = stripeSubscriptionId;
  }

  if (parent.subscriptionActivatedAt ?? invoicePaidAt ?? subscriptionStartedAt) {
    update.subscriptionActivatedAt =
      parent.subscriptionActivatedAt ?? invoicePaidAt ?? subscriptionStartedAt;
  }

  if (subscription) {
    update.subscriptionRenewalAt =
      subscriptionStatus === "canceled"
        ? null
        : toIsoTimestamp(subscription.items.data[0]?.current_period_end ?? null);
  }

  if (!latestInvoice) {
    return update;
  }

  return {
    ...update,
    ...getInvoiceSummaryUpdate(latestInvoice),
  };
}

function isStripeMissingResourceError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "resource_missing"
  );
}

async function retrieveSubscriptionById(
  stripe: Stripe,
  subscriptionId: string,
) {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["latest_invoice"],
    });
  } catch (error) {
    if (isStripeMissingResourceError(error)) {
      return null;
    }

    throw error;
  }
}

async function retrieveStripeSubscriptionForBackfill(
  stripe: Stripe,
  profile: ParentProfile,
) {
  const existingSubscriptionId = normalizeNullableString(profile.parent.stripeSubscriptionId);

  if (existingSubscriptionId) {
    const subscription = await retrieveSubscriptionById(stripe, existingSubscriptionId);

    if (subscription) {
      return subscription;
    }
  }

  const existingCustomerId = normalizeNullableString(profile.parent.stripeCustomerId);

  if (!existingCustomerId) {
    return null;
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: existingCustomerId,
    limit: 10,
    status: "all",
  });

  const selected = selectStripeBackfillSubscription(subscriptions.data);

  if (!selected) {
    return null;
  }

  return retrieveSubscriptionById(stripe, selected.id);
}

function getExpandedLatestInvoice(subscription: Stripe.Subscription | null) {
  if (!subscription) {
    return null;
  }

  const latestInvoice = subscription.latest_invoice ?? null;

  if (!latestInvoice || typeof latestInvoice === "string") {
    return null;
  }

  return latestInvoice;
}

async function retrieveLatestInvoiceForBackfill(
  stripe: Stripe,
  profile: ParentProfile,
  subscription: Stripe.Subscription | null,
) {
  const expandedLatestInvoice = getExpandedLatestInvoice(subscription);

  if (expandedLatestInvoice) {
    return expandedLatestInvoice;
  }

  if (subscription?.id) {
    const invoices = await stripe.invoices.list({
      limit: 1,
      subscription: subscription.id,
    });

    if (invoices.data[0]) {
      return invoices.data[0];
    }
  }

  const existingCustomerId = normalizeNullableString(profile.parent.stripeCustomerId);

  if (!existingCustomerId) {
    return null;
  }

  const invoices = await stripe.invoices.list({
    customer: existingCustomerId,
    limit: 1,
  });

  return invoices.data[0] ?? null;
}

type BackfillStripeBillingOptions = {
  dryRun?: boolean;
  stripe: Stripe;
};

export async function backfillStripeBillingForProfile(
  profile: ParentProfile,
  options: BackfillStripeBillingOptions,
): Promise<StripeBillingBackfillResult> {
  const email = normalizeEmail(profile.parent.email);
  const hasStripeReference = Boolean(
    normalizeNullableString(profile.parent.stripeCustomerId) ||
      normalizeNullableString(profile.parent.stripeSubscriptionId),
  );

  if (!hasStripeReference) {
    return {
      dryRun: options.dryRun === true,
      email,
      foundLatestInvoice: false,
      foundStripeSubscription: false,
      latestInvoiceId: null,
      skippedReason: "No Stripe customer or subscription reference is stored on this parent.",
      stripeSubscriptionId: null,
      update: null,
      updatedProfile: null,
    };
  }

  const subscription = await retrieveStripeSubscriptionForBackfill(options.stripe, profile);
  const latestInvoice = await retrieveLatestInvoiceForBackfill(
    options.stripe,
    profile,
    subscription,
  );

  if (!subscription && !latestInvoice) {
    return {
      dryRun: options.dryRun === true,
      email,
      foundLatestInvoice: false,
      foundStripeSubscription: false,
      latestInvoiceId: null,
      skippedReason: "No Stripe subscription or invoice was found for this parent.",
      stripeSubscriptionId: profile.parent.stripeSubscriptionId,
      update: null,
      updatedProfile: null,
    };
  }

  const update = getStripeBackfillUpdate({
    latestInvoice,
    parent: profile.parent,
    subscription,
  });

  if (options.dryRun) {
    return {
      dryRun: true,
      email,
      foundLatestInvoice: Boolean(latestInvoice),
      foundStripeSubscription: Boolean(subscription),
      latestInvoiceId: latestInvoice?.id ?? null,
      skippedReason: null,
      stripeSubscriptionId: subscription?.id ?? profile.parent.stripeSubscriptionId,
      update,
      updatedProfile: null,
    };
  }

  const updatedProfile = await updateParentSubscription(email, update);

  if (!updatedProfile) {
    throw new Error(`Could not update the parent profile for ${email}.`);
  }

  return {
    dryRun: false,
    email,
    foundLatestInvoice: Boolean(latestInvoice),
    foundStripeSubscription: Boolean(subscription),
    latestInvoiceId: latestInvoice?.id ?? null,
    skippedReason: null,
    stripeSubscriptionId: subscription?.id ?? updatedProfile.parent.stripeSubscriptionId,
    update,
    updatedProfile,
  };
}

export async function backfillStripeBillingForEmail(
  email: string,
  options: BackfillStripeBillingOptions,
) {
  const profile = await getProfileByEmail(email);

  if (!profile) {
    return {
      dryRun: options.dryRun === true,
      email: normalizeEmail(email),
      foundLatestInvoice: false,
      foundStripeSubscription: false,
      latestInvoiceId: null,
      skippedReason: "Parent profile was not found in the current store.",
      stripeSubscriptionId: null,
      update: null,
      updatedProfile: null,
    } satisfies StripeBillingBackfillResult;
  }

  return backfillStripeBillingForProfile(profile, options);
}
