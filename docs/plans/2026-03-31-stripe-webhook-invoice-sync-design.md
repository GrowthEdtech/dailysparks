# Stripe Webhook + Invoice Sync Design

## Goal

Make Stripe the billing source of truth after checkout, while surfacing the latest paid invoice inside `/billing`.

## Decision

Use a hybrid flow:

- Keep `/billing/success` finalization so parents see activation immediately after returning from Stripe Checkout.
- Add a signed Stripe webhook endpoint for durable updates from Stripe.
- Store a compact latest-invoice summary directly on the parent record so dashboard and billing UI can render without extra Stripe API calls.

## Data Model

Parent billing state continues to store subscription status and cadence. It now also stores the latest invoice summary:

- `latestInvoiceId`
- `latestInvoiceNumber`
- `latestInvoiceStatus`
- `latestInvoiceHostedUrl`
- `latestInvoicePdfUrl`
- `latestInvoiceAmountPaid`
- `latestInvoiceCurrency`
- `latestInvoicePaidAt`
- `latestInvoicePeriodStart`
- `latestInvoicePeriodEnd`

## Webhook Events

Process these Stripe events:

- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

`invoice.paid` is the main source for invoice UI fields and renewal timing. Subscription lifecycle events keep cancellation and cadence changes in sync.

## UI

Add an invoice-delivery section to `/billing` that shows:

- recipient email
- latest invoice number
- paid date
- billing period
- amount paid
- `View invoice` and `Download PDF` actions when Stripe provides URLs

If no invoice exists yet, show a clear placeholder that Stripe will email the first paid invoice after the charge completes.
