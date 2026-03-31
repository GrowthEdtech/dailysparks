import { describe, expect, test } from "vitest";
import type Stripe from "stripe";

import type { ParentRecord } from "./mvp-types";
import {
  getStripeBackfillUpdate,
  selectStripeBackfillSubscription,
} from "./stripe-backfill";

function createParentRecord(overrides: Partial<ParentRecord> = {}): ParentRecord {
  return {
    id: "parent-1",
    email: "parent@example.com",
    fullName: "Parent Example",
    subscriptionStatus: "trial",
    subscriptionPlan: "yearly",
    stripeCustomerId: "cus_existing",
    stripeSubscriptionId: "sub_existing",
    trialStartedAt: "2026-03-31T00:00:00.000Z",
    trialEndsAt: "2026-04-07T00:00:00.000Z",
    subscriptionActivatedAt: null,
    subscriptionRenewalAt: null,
    latestInvoiceId: null,
    latestInvoiceNumber: null,
    latestInvoiceStatus: null,
    latestInvoiceHostedUrl: null,
    latestInvoicePdfUrl: null,
    latestInvoiceAmountPaid: null,
    latestInvoiceCurrency: null,
    latestInvoicePaidAt: null,
    latestInvoicePeriodStart: null,
    latestInvoicePeriodEnd: null,
    createdAt: "2026-03-31T00:00:00.000Z",
    updatedAt: "2026-03-31T00:00:00.000Z",
    ...overrides,
  };
}

function createSubscription(
  overrides: Partial<Stripe.Subscription>,
): Stripe.Subscription {
  return {
    id: "sub_yearly",
    object: "subscription",
    application: null,
    application_fee_percent: null,
    automatic_tax: {
      disabled_reason: null,
      enabled: false,
      liability: null,
    },
    billing_cycle_anchor: 1774915200,
    billing_cycle_anchor_config: null,
    billing_mode: { type: "flexible" },
    cancel_at: null,
    cancel_at_period_end: false,
    canceled_at: null,
    collection_method: "charge_automatically",
    created: 1774915200,
    currency: "usd",
    current_period_end: 1806451200,
    current_period_start: 1774915200,
    customer: "cus_123",
    days_until_due: null,
    default_payment_method: null,
    default_source: null,
    default_tax_rates: [],
    description: null,
    discounts: [],
    ended_at: null,
    invoice_settings: {
      account_tax_ids: null,
      issuer: {
        type: "self",
      },
    },
    items: {
      data: [
        {
          id: "si_123",
          object: "subscription_item",
          billing_thresholds: null,
          created: 1774915200,
          current_period_end: 1806451200,
          current_period_start: 1774915200,
          discounts: [],
          metadata: {},
          plan: {
            active: true,
            aggregate_usage: null,
            amount: 14400,
            amount_decimal: "14400",
            billing_scheme: "per_unit",
            created: 1774915200,
            currency: "usd",
            id: "price_yearly",
            interval: "year",
            interval_count: 1,
            livemode: false,
            metadata: {},
            meter: null,
            nickname: null,
            object: "plan",
            product: "prod_yearly",
            tiers_mode: null,
            transform_usage: null,
            trial_period_days: null,
            usage_type: "licensed",
          },
          price: {
            id: "price_yearly",
            object: "price",
            active: true,
            billing_scheme: "per_unit",
            created: 1774915200,
            currency: "usd",
            custom_unit_amount: null,
            livemode: false,
            lookup_key: null,
            metadata: {},
            nickname: null,
            product: "prod_yearly",
            recurring: {
              aggregate_usage: null,
              interval: "year",
              interval_count: 1,
              meter: null,
              trial_period_days: null,
              usage_type: "licensed",
            },
            tax_behavior: "unspecified",
            tiers_mode: null,
            transform_quantity: null,
            type: "recurring",
            unit_amount: 14400,
            unit_amount_decimal: "14400",
          },
          quantity: 1,
          subscription: "sub_yearly",
          tax_rates: [],
        },
      ],
      has_more: false,
      object: "list",
      total_count: 1,
      url: "/v1/subscription_items?subscription=sub_yearly",
    },
    latest_invoice: null,
    livemode: false,
    metadata: {},
    next_pending_invoice_item_invoice: null,
    on_behalf_of: null,
    pause_collection: null,
    payment_settings: {
      payment_method_options: null,
      payment_method_types: null,
      save_default_payment_method: "off",
    },
    pending_invoice_item_interval: null,
    pending_setup_intent: null,
    pending_update: null,
    schedule: null,
    start_date: 1774915200,
    status: "active",
    test_clock: null,
    transfer_data: null,
    trial_end: null,
    trial_settings: {
      end_behavior: {
        missing_payment_method: "create_invoice",
      },
    },
    trial_start: null,
    ...overrides,
  } as Stripe.Subscription;
}

function createInvoice(overrides: Partial<Stripe.Invoice>): Stripe.Invoice {
  return {
    id: "in_123",
    object: "invoice",
    account_country: "US",
    account_name: "Daily Sparks",
    account_tax_ids: null,
    amount_due: 14400,
    amount_overpaid: 0,
    amount_paid: 14400,
    amount_remaining: 0,
    amount_shipping: 0,
    application: null,
    attempt_count: 1,
    attempted: true,
    auto_advance: false,
    automatic_tax: {
      disabled_reason: null,
      enabled: false,
      liability: null,
      status: null,
    },
    billing_reason: "subscription_cycle",
    charge: null,
    collection_method: "charge_automatically",
    created: 1774915800,
    currency: "usd",
    custom_fields: null,
    customer: "cus_123",
    customer_address: null,
    customer_email: "parent@example.com",
    customer_name: "Parent Example",
    customer_phone: null,
    customer_shipping: null,
    customer_tax_exempt: "none",
    customer_tax_ids: [],
    default_payment_method: null,
    default_source: null,
    default_tax_rates: [],
    description: null,
    discounts: [],
    due_date: null,
    ending_balance: null,
    footer: null,
    from_invoice: null,
    hosted_invoice_url: "https://invoice.stripe.com/i/in_123",
    invoice_pdf: "https://pay.stripe.com/invoice/in_123/pdf",
    issuer: { type: "self" },
    last_finalization_error: null,
    lines: {
      data: [
        {
          id: "il_123",
          object: "line_item",
          amount: 14400,
          amount_excluding_tax: 14400,
          currency: "usd",
          description: "Daily Sparks Yearly",
          discount_amounts: [],
          discountable: true,
          discounts: [],
          invoice: "in_123",
          livemode: false,
          metadata: {},
          parent: {
            type: "subscription_item_details",
            subscription_item_details: {
              invoice_item: null,
              proration: false,
              proration_details: {
                credited_items: null,
              },
              subscription: "sub_yearly",
              subscription_item: "si_123",
            },
          },
          period: {
            end: 1806451200,
            start: 1774915200,
          },
          pretax_credit_amounts: [],
          pricing: {
            price_details: {
              price: "price_yearly",
              product: "prod_yearly",
            },
            type: "price_details",
            unit_amount_decimal: "14400",
          },
          quantity: 1,
          tax_amounts: [],
          tax_rates: [],
          type: "subscription",
          unit_amount_excluding_tax: "14400",
        },
      ],
      has_more: false,
      object: "list",
      total_count: 1,
      url: "/v1/invoices/in_123/lines",
    },
    livemode: false,
    metadata: {},
    next_payment_attempt: null,
    number: "DS-2026-0001",
    on_behalf_of: null,
    paid: true,
    paid_out_of_band: false,
    parent: {
      quote_details: null,
      subscription_details: {
        metadata: {
          parentEmail: "parent@example.com",
          subscriptionPlan: "yearly",
        },
        subscription: "sub_yearly",
      },
      type: "subscription_details",
    },
    payment_settings: {
      default_mandate: null,
      payment_method_options: null,
      payment_method_types: null,
    },
    period_end: 1806451200,
    period_start: 1774915200,
    post_payment_credit_notes_amount: 0,
    pre_payment_credit_notes_amount: 0,
    receipt_number: null,
    shipping_cost: null,
    shipping_details: null,
    starting_balance: 0,
    statement_descriptor: null,
    status: "paid",
    status_transitions: {
      finalized_at: 1774915800,
      marked_uncollectible_at: null,
      paid_at: 1774915860,
      voided_at: null,
    },
    subtotal: 14400,
    subtotal_excluding_tax: 14400,
    tax: null,
    test_clock: null,
    total: 14400,
    total_discount_amounts: [],
    total_excluding_tax: 14400,
    total_pretax_credit_amounts: [],
    total_tax_amounts: [],
    transfer_data: null,
    webhooks_delivered_at: null,
    subscription: "sub_yearly",
    ...overrides,
  } as Stripe.Invoice;
}

describe("stripe backfill helpers", () => {
  test("prefers the highest-signal subscription when multiple records exist", () => {
    const canceled = createSubscription({
      created: 1774915200,
      id: "sub_canceled",
      status: "canceled",
    });
    const active = createSubscription({
      created: 1775001600,
      id: "sub_active",
      status: "active",
    });

    expect(selectStripeBackfillSubscription([canceled, active])?.id).toBe("sub_active");
  });

  test("builds a paid yearly update with invoice summary and renewal timing", () => {
    const update = getStripeBackfillUpdate({
      latestInvoice: createInvoice(),
      parent: createParentRecord(),
      subscription: createSubscription(),
    });

    expect(update.subscriptionPlan).toBe("yearly");
    expect(update.subscriptionStatus).toBe("active");
    expect(update.stripeCustomerId).toBe("cus_123");
    expect(update.stripeSubscriptionId).toBe("sub_yearly");
    expect(update.subscriptionActivatedAt).toBe("2026-03-31T00:11:00.000Z");
    expect(update.subscriptionRenewalAt).toBe("2027-03-31T00:00:00.000Z");
    expect(update.latestInvoiceId).toBe("in_123");
    expect(update.latestInvoiceStatus).toBe("paid");
    expect(update.latestInvoiceAmountPaid).toBe(14400);
    expect(update.latestInvoicePeriodStart).toBe("2026-03-31T00:00:00.000Z");
    expect(update.latestInvoicePeriodEnd).toBe("2027-03-31T00:00:00.000Z");
  });

  test("preserves existing activation time while still refreshing invoice state", () => {
    const update = getStripeBackfillUpdate({
      latestInvoice: createInvoice(),
      parent: createParentRecord({
        subscriptionActivatedAt: "2026-03-30T12:00:00.000Z",
      }),
      subscription: createSubscription(),
    });

    expect(update.subscriptionActivatedAt).toBe("2026-03-30T12:00:00.000Z");
    expect(update.latestInvoiceHostedUrl).toBe("https://invoice.stripe.com/i/in_123");
  });
});
