import Stripe from "stripe";

import type { ParentProfile, SubscriptionPlan } from "./mvp-types";
import { isSubscriptionPlan } from "./mvp-types";
import { updateParentSubscription } from "./mvp-store";

const STRIPE_PLAN_CONFIG = {
  monthly: {
    unitAmount: 1500,
    interval: "month",
    productName: "Daily Sparks Monthly",
  },
  yearly: {
    unitAmount: 14400,
    interval: "year",
    productName: "Daily Sparks Yearly",
  },
} as const;

type CheckoutPlan = Exclude<SubscriptionPlan, null>;

type CheckoutSessionInput = {
  origin: string;
  profile: ParentProfile;
  subscriptionPlan: CheckoutPlan;
};

type FinalizeCheckoutInput = {
  sessionId: string;
  expectedEmail: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY?.trim() ?? "";
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

function getStripeServerClient() {
  const secretKey = getStripeSecretKey();

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  return new Stripe(secretKey);
}

function getCheckoutPlanConfig(subscriptionPlan: CheckoutPlan) {
  return STRIPE_PLAN_CONFIG[subscriptionPlan];
}

async function ensureStripeCustomer(profile: ParentProfile) {
  if (profile.parent.stripeCustomerId) {
    return profile.parent.stripeCustomerId;
  }

  const stripe = getStripeServerClient();
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
  const planConfig = getCheckoutPlanConfig(input.subscriptionPlan);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: input.profile.parent.id,
    success_url: `${input.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.origin}/billing?canceled=1`,
    allow_promotion_codes: true,
    metadata: {
      parentEmail: input.profile.parent.email,
      subscriptionPlan: input.subscriptionPlan,
    },
    subscription_data: {
      metadata: {
        parentEmail: input.profile.parent.email,
        subscriptionPlan: input.subscriptionPlan,
      },
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: planConfig.unitAmount,
          recurring: {
            interval: planConfig.interval,
          },
          product_data: {
            name: planConfig.productName,
            description: "Daily Sparks parent subscription",
          },
        },
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
    expand: ["subscription"],
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
  });

  if (!profile) {
    throw new Error("We could not update the parent profile after Stripe checkout.");
  }

  return profile;
}
