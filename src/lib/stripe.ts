import Stripe from "stripe";

import type {
  ParentProfile,
  SubscriptionPlan,
  SubscriptionStatus,
  UpdateParentSubscriptionInput,
} from "./mvp-types";
import { isSubscriptionPlan } from "./mvp-types";
import { getProfileByEmail, updateParentSubscription } from "./mvp-store";
import { maybeSendBillingStatusNotification } from "./billing-status-notification";
import type { PricingMarket } from "./pricing-market";
import {
  getPricingForPlan,
  getPricingIntervalForPlan,
  getPricingLookupKeyForPlan,
} from "./pricing-market";

type CheckoutPlan = Exclude<SubscriptionPlan, null>;

type CheckoutSessionInput = {
  origin: string;
  pricingMarket: PricingMarket;
  profile: ParentProfile;
  subscriptionPlan: CheckoutPlan;
  trialDays?: number;
};

type FinalizeCheckoutInput = {
  sessionId: string;
  expectedEmail: string;
};

type StripeCustomerReference =
  | string
  | Stripe.Customer
  | Stripe.DeletedCustomer
  | null;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeNullableString(value: string | null | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isStripeCustomerMissingError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    code?: string;
    param?: string;
  };

  return (
    candidate.code === "resource_missing" &&
    (candidate.param === "customer" || candidate.param === "id")
  );
}

function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY?.trim() ?? "";
}

function getStripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
}

export function getStripePublishableKey() {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
}

export function isStripeSandboxMode() {
  const publishableKey = getStripePublishableKey();

  if (publishableKey) {
    return publishableKey.startsWith("pk_test_");
  }

  return getStripeSecretKey().startsWith("sk_test_");
}

export function isStripeConfigured() {
  return Boolean(getStripeSecretKey());
}

export function isStripeWebhookConfigured() {
  return Boolean(getStripeWebhookSecret());
}

export function getStripeServerClient() {
  const secretKey = getStripeSecretKey();

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  return new Stripe(secretKey);
}

export function constructStripeWebhookEvent(payload: string, signature: string) {
  const webhookSecret = getStripeWebhookSecret();

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
  }

  return getStripeServerClient().webhooks.constructEvent(payload, signature, webhookSecret);
}

async function getCheckoutPriceForPlan(subscriptionPlan: CheckoutPlan) {
  const stripe = getStripeServerClient();
  const lookupKey = getPricingLookupKeyForPlan(subscriptionPlan);
  const priceList = await stripe.prices.list({
    active: true,
    limit: 10,
    lookup_keys: [lookupKey],
  });
  const recurringInterval = getPricingIntervalForPlan(subscriptionPlan);
  const matchingPrice = priceList.data.find((price) => {
    if (!price.recurring) {
      return false;
    }

    return (
      price.lookup_key === lookupKey &&
      price.recurring.interval === recurringInterval &&
      price.product &&
      typeof price.product === "string"
    );
  });

  if (!matchingPrice) {
    throw new Error(
      `Stripe price lookup key ${lookupKey} is not configured for ${subscriptionPlan}.`,
    );
  }

  return matchingPrice;
}

function toIsoTimestamp(value: number | null | undefined) {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

function inferPlanFromInterval(interval: string | null | undefined): CheckoutPlan | null {
  if (interval === "month") {
    return "monthly";
  }

  if (interval === "year") {
    return "yearly";
  }

  return null;
}

function inferPlanFromSubscription(
  subscription: Stripe.Subscription | null | undefined,
): CheckoutPlan | null {
  const interval = subscription?.items.data[0]?.price?.recurring?.interval ?? null;

  return inferPlanFromInterval(interval);
}

function getInvoicePeriod(invoice: Stripe.Invoice) {
  const periodLine = invoice.lines.data.find(
    (line) => typeof line.period?.start === "number" && typeof line.period?.end === "number",
  );

  return {
    periodStart: toIsoTimestamp(periodLine?.period?.start ?? null),
    periodEnd: toIsoTimestamp(periodLine?.period?.end ?? null),
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
  const { periodStart, periodEnd } = getInvoicePeriod(invoice);

  return {
    latestInvoiceId: invoice.id,
    latestInvoiceNumber: normalizeNullableString(invoice.number),
    latestInvoiceStatus: normalizeNullableString(invoice.status),
    latestInvoiceHostedUrl: normalizeNullableString(invoice.hosted_invoice_url),
    latestInvoicePdfUrl: normalizeNullableString(invoice.invoice_pdf),
    latestInvoiceAmountPaid: getInvoiceAmountForSummary(invoice),
    latestInvoiceCurrency: normalizeNullableString(invoice.currency),
    latestInvoicePaidAt: toIsoTimestamp(invoice.status_transitions?.paid_at ?? null),
    latestInvoicePeriodStart: periodStart,
    latestInvoicePeriodEnd: periodEnd,
  };
}

async function getCustomerEmailFromStripeCustomer(
  stripe: Stripe,
  customerReference: StripeCustomerReference,
) {
  if (!customerReference) {
    return null;
  }

  if (typeof customerReference !== "string") {
    if ("deleted" in customerReference && customerReference.deleted) {
      return null;
    }

    return normalizeNullableString(customerReference.email)?.toLowerCase() ?? null;
  }

  const customer = await stripe.customers.retrieve(customerReference);

  if ("deleted" in customer && customer.deleted) {
    return null;
  }

  return normalizeNullableString(customer.email)?.toLowerCase() ?? null;
}

async function resolveParentEmail(options: {
  stripe: Stripe;
  fallbackEmail?: string | null;
  metadataEmail?: string | null;
  customer: StripeCustomerReference;
}) {
  const fallbackEmail = normalizeNullableString(options.fallbackEmail)?.toLowerCase() ?? null;

  if (fallbackEmail) {
    return fallbackEmail;
  }

  const metadataEmail = normalizeNullableString(options.metadataEmail)?.toLowerCase() ?? null;

  if (metadataEmail) {
    return metadataEmail;
  }

  return getCustomerEmailFromStripeCustomer(options.stripe, options.customer);
}

async function syncParentSubscriptionByEmail(
  email: string,
  input: UpdateParentSubscriptionInput,
) {
  const normalizedEmail = normalizeEmail(email);
  const profile = await getProfileByEmail(normalizedEmail);

  if (!profile) {
    return null;
  }

  return updateParentSubscription(normalizedEmail, input);
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

  if (status === "canceled" || status === "unpaid" || status === "incomplete_expired" || status === "past_due") {
    return "canceled";
  }

  return null;
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription") {
    return null;
  }

  const stripe = getStripeServerClient();
  const email = await resolveParentEmail({
    stripe,
    fallbackEmail: session.customer_details?.email ?? session.customer_email,
    metadataEmail: session.metadata?.parentEmail,
    customer: session.customer as StripeCustomerReference,
  });
  const subscriptionPlan = inferPlanFromSession(session);
  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  const stripeSubscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  if (!email) {
    return null;
  }

  const profile = await getProfileByEmail(email);

  if (!profile) {
    return null;
  }

  return syncParentSubscriptionByEmail(email, {
    subscriptionPlan: subscriptionPlan ?? profile.parent.subscriptionPlan ?? undefined,
    subscriptionStatus: "active",
    stripeCustomerId: stripeCustomerId ?? profile.parent.stripeCustomerId,
    stripeSubscriptionId: stripeSubscriptionId ?? profile.parent.stripeSubscriptionId,
    subscriptionActivatedAt:
      profile.parent.subscriptionActivatedAt ?? toIsoTimestamp(session.created),
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const stripe = getStripeServerClient();
  const email = await resolveParentEmail({
    stripe,
    fallbackEmail: invoice.customer_email,
    metadataEmail: invoice.parent?.subscription_details?.metadata?.parentEmail ?? null,
    customer: invoice.customer as StripeCustomerReference,
  });

  if (!email) {
    return null;
  }

  const profile = await getProfileByEmail(email);

  if (!profile) {
    return null;
  }

  const paidAt =
    toIsoTimestamp(invoice.status_transitions?.paid_at ?? null) ??
    toIsoTimestamp(invoice.created);
  const { periodEnd } = getInvoicePeriod(invoice);
  const stripeCustomerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;
  const updatedProfile = await syncParentSubscriptionByEmail(email, {
    subscriptionPlan: profile.parent.subscriptionPlan ?? undefined,
    subscriptionStatus: "active",
    stripeCustomerId: stripeCustomerId ?? profile.parent.stripeCustomerId,
    stripeSubscriptionId: profile.parent.stripeSubscriptionId ?? undefined,
    subscriptionActivatedAt: profile.parent.subscriptionActivatedAt ?? paidAt,
    subscriptionRenewalAt: periodEnd ?? profile.parent.subscriptionRenewalAt,
    ...getInvoiceSummaryUpdate(invoice),
  });

  if (updatedProfile) {
    try {
      await maybeSendBillingStatusNotification({
        profile: updatedProfile,
        invoiceId: invoice.id,
        invoiceStatus: invoice.status,
      });
    } catch (error) {
      console.error("Failed to send billing status update notification.", error);
    }
  }

  return updatedProfile;
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const stripe = getStripeServerClient();
  const email = await resolveParentEmail({
    stripe,
    fallbackEmail: invoice.customer_email,
    metadataEmail: invoice.parent?.subscription_details?.metadata?.parentEmail ?? null,
    customer: invoice.customer as StripeCustomerReference,
  });

  if (!email) {
    return null;
  }

  const profile = await getProfileByEmail(email);

  if (!profile) {
    return null;
  }

  const updatedProfile = await syncParentSubscriptionByEmail(email, {
    stripeCustomerId:
      (typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id) ??
      profile.parent.stripeCustomerId,
    stripeSubscriptionId: profile.parent.stripeSubscriptionId ?? undefined,
    ...getInvoiceSummaryUpdate(invoice),
  });

  if (updatedProfile) {
    try {
      await maybeSendBillingStatusNotification({
        profile: updatedProfile,
        invoiceId: invoice.id,
        invoiceStatus: invoice.status,
      });
    } catch (error) {
      console.error("Failed to send billing status update notification.", error);
    }
  }

  return updatedProfile;
}

async function handleSubscriptionLifecycleEvent(
  subscription: Stripe.Subscription,
  eventType: Stripe.Event.Type,
) {
  const stripe = getStripeServerClient();
  const email = await resolveParentEmail({
    stripe,
    metadataEmail: subscription.metadata.parentEmail,
    customer: subscription.customer as StripeCustomerReference,
  });

  if (!email) {
    return null;
  }

  const profile = await getProfileByEmail(email);

  if (!profile) {
    return null;
  }

  const nextStatus =
    eventType === "customer.subscription.deleted"
      ? "canceled"
      : getSubscriptionStatusFromStripeStatus(subscription.status);
  const nextRenewalAt =
    eventType === "customer.subscription.deleted"
      ? null
      : toIsoTimestamp(subscription.items.data[0]?.current_period_end ?? null);

  return syncParentSubscriptionByEmail(email, {
    subscriptionPlan:
      inferPlanFromSubscription(subscription) ?? profile.parent.subscriptionPlan ?? undefined,
    subscriptionStatus: nextStatus ?? undefined,
    stripeCustomerId:
      (typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id) ?? profile.parent.stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    subscriptionRenewalAt: nextRenewalAt,
  });
}

async function ensureStripeCustomer(profile: ParentProfile) {
  const stripe = getStripeServerClient();
  const persistedCustomerId = normalizeNullableString(profile.parent.stripeCustomerId);

  if (persistedCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(persistedCustomerId);

      if (!("deleted" in customer && customer.deleted)) {
        return customer.id;
      }
    } catch (error) {
      if (!isStripeCustomerMissingError(error)) {
        throw error;
      }
    }
  }

  const customer = await stripe.customers.create({
    email: profile.parent.email,
    name: profile.parent.fullName,
    metadata: {
      parentEmail: profile.parent.email,
      parentId: profile.parent.id,
    },
  });

  return customer.id;
}

function inferPlanFromSession(session: Stripe.Checkout.Session): CheckoutPlan | null {
  const metadataPlan = session.metadata?.subscriptionPlan ?? "";

  if (isSubscriptionPlan(metadataPlan)) {
    return metadataPlan;
  }

  return null;
}

export async function createCheckoutSessionForParent(
  input: CheckoutSessionInput,
) {
  const stripe = getStripeServerClient();
  const customerId = await ensureStripeCustomer(input.profile);
  const checkoutPrice = await getCheckoutPriceForPlan(input.subscriptionPlan);
  const planPrice = getPricingForPlan(input.subscriptionPlan, input.pricingMarket);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    currency: planPrice.currency,
    customer: customerId,
    client_reference_id: input.profile.parent.id,
    success_url: `${input.origin}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.origin}/billing?canceled=1`,
    allow_promotion_codes: true,
    metadata: {
      parentEmail: input.profile.parent.email,
      pricingMarket: input.pricingMarket,
      subscriptionPlan: input.subscriptionPlan,
    },
    subscription_data: {
      metadata: {
        parentEmail: input.profile.parent.email,
        pricingMarket: input.pricingMarket,
        subscriptionPlan: input.subscriptionPlan,
      },
      ...(input.trialDays
        ? { trial_period_days: input.trialDays }
        : {}),
    },
    line_items: [
      {
        quantity: 1,
        price: checkoutPrice.id,
      },
    ],
  });

  if (!session.url) {
    throw new Error("Stripe did not return a hosted checkout URL.");
  }

  return {
    url: session.url,
    stripeCustomerId: customerId,
    sessionId: session.id,
  };
}

export async function createBillingPortalSessionForParent(
  origin: string,
  profile: ParentProfile,
) {
  if (!profile.parent.stripeCustomerId) {
    throw new Error("No Stripe customer is available for this parent.");
  }

  const stripe = getStripeServerClient();

  return stripe.billingPortal.sessions.create({
    customer: profile.parent.stripeCustomerId,
    return_url: `${origin}/billing`,
  });
}

export async function finalizeCheckoutSessionForParent(
  input: FinalizeCheckoutInput,
) {
  const stripe = getStripeServerClient();
  const checkoutSession = await stripe.checkout.sessions.retrieve(input.sessionId, {
    expand: ["subscription", "subscription.latest_invoice"],
  });
  const expectedEmail = normalizeEmail(input.expectedEmail);
  const sessionEmail = normalizeEmail(
    checkoutSession.customer_details?.email ??
      checkoutSession.customer_email ??
      checkoutSession.metadata?.parentEmail ??
      "",
  );
  const subscriptionPlan = inferPlanFromSession(checkoutSession);
  const stripeCustomerId =
    typeof checkoutSession.customer === "string"
      ? checkoutSession.customer
      : checkoutSession.customer?.id ?? null;
  const stripeSubscriptionId =
    typeof checkoutSession.subscription === "string"
      ? checkoutSession.subscription
      : checkoutSession.subscription?.id ?? null;
  const subscriptionActivatedAt = new Date(checkoutSession.created * 1000).toISOString();
  const renewalTimestamp =
    typeof checkoutSession.subscription !== "string"
      ? checkoutSession.subscription?.items.data[0]?.current_period_end ?? null
      : null;
  const subscriptionRenewalAt =
    typeof renewalTimestamp === "number"
      ? new Date(renewalTimestamp * 1000).toISOString()
      : null;
  const latestInvoice =
    typeof checkoutSession.subscription !== "string"
      ? checkoutSession.subscription?.latest_invoice ?? null
      : null;
  const latestInvoiceUpdate =
    latestInvoice && typeof latestInvoice !== "string"
      ? getInvoiceSummaryUpdate(latestInvoice)
      : {};

  if (!sessionEmail || sessionEmail !== expectedEmail) {
    throw new Error("The Stripe checkout session does not match the logged-in parent.");
  }

  if (checkoutSession.status !== "complete" || !subscriptionPlan || !stripeSubscriptionId) {
    throw new Error("The Stripe checkout session is not complete yet.");
  }

  const profile = await updateParentSubscription(expectedEmail, {
    subscriptionPlan,
    subscriptionStatus: "active",
    stripeCustomerId,
    stripeSubscriptionId,
    subscriptionActivatedAt,
    subscriptionRenewalAt,
    ...latestInvoiceUpdate,
  });

  if (!profile) {
    throw new Error("We could not update the parent profile after Stripe checkout.");
  }

  return profile;
}

export async function handleStripeWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutSessionCompleted(
        event.data.object as Stripe.Checkout.Session,
      );
    case "invoice.paid":
      return handleInvoicePaid(event.data.object as Stripe.Invoice);
    case "invoice.payment_failed":
      return handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return handleSubscriptionLifecycleEvent(
        event.data.object as Stripe.Subscription,
        event.type,
      );
    default:
      return null;
  }
}
