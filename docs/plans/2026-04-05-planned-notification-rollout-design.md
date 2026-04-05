# Planned Notification Rollout Design

## Goal

Promote the three planned notification families into real, production-capable
HTML notifications:

- `trial ending reminder`
- `billing status update`
- `delivery support alert`

## Decision

Daily Sparks will connect these notification families to the shared HTML
notification system through the most natural triggering surfaces already present
in the product:

- `trial ending reminder` -> `growth reconciliation` scheduler
- `delivery support alert` -> `growth reconciliation` scheduler
- `billing status update` -> `Stripe webhook` invoice lifecycle

## Why this is the right split

These triggers already carry the product meaning we need:

- `growth reconciliation` already knows which families are close to losing
  value because their trial is ending or their delivery setup is blocked
- `Stripe webhook` already knows when a billing event becomes authoritative

This avoids building a second campaign scheduler when the app already contains
the operational signals.

## Notification semantics

### Trial ending reminder

Audience:

- parent inbox

When to send:

- active `trial_active` families
- no first successful brief yet
- trial ending within the next 72 hours

Dedupe:

- one email per `trialEndsAt` value

### Delivery support alert

Audience:

- parent inbox

When to send:

- family is active enough to use the product
- delivery is blocked by:
  - `activeWithoutDispatchableChannel`, or
  - `reminderFailuresBlockingActivation`

Dedupe:

- cooldown-based
- reason-key aware so the same operational state does not spam repeatedly

### Billing status update

Audience:

- parent inbox

When to send:

- `invoice.paid`
- `invoice.payment_failed`

Dedupe:

- one email per `invoiceId + status`

## Shared delivery backbone

These new notifications should use the same email-safe HTML shell already used
by the onboarding reminder.

To avoid duplicated SMTP logic, notification delivery should be centralized in
one shared transactional email sender.

## Data changes

Parent records need lightweight notification tracking so scheduler reruns and
Stripe webhook retries do not spam:

- `trialEndingReminderLastNotifiedAt`
- `trialEndingReminderLastTrialEndsAt`
- `deliverySupportAlertLastNotifiedAt`
- `deliverySupportAlertLastReasonKey`
- `billingStatusNotificationLastSentAt`
- `billingStatusNotificationLastInvoiceId`
- `billingStatusNotificationLastInvoiceStatus`

## Non-goals

- marketing campaigns
- multiple trial-ending reminder stages
- digest emails
- replacing PDF content delivery with HTML
