# Stripe Sandbox Checkout Design

Add real Stripe sandbox checkout to Daily Sparks so the billing experience moves from plan selection into a working hosted payment flow.

## Scope

This iteration should:

- keep the existing monthly and yearly billing UI
- send the parent into Stripe Checkout in sandbox mode
- return to Daily Sparks on success or cancel
- mark the parent subscription as active after a verified successful checkout
- keep all Stripe secrets on the server

This iteration should not:

- use the live Stripe secret key
- hardcode any key in source control
- depend on a client-side secret or embedded checkout

## Recommended Approach

Use server-created Stripe Checkout Sessions in `subscription` mode.

Why this is the best fit:

- it matches the current hosted-product stage of Daily Sparks
- it keeps card collection fully inside Stripe
- it avoids exposing sensitive payment logic to the browser
- it lets the app stay aligned with the current server-side session architecture

## Flow

1. The logged-in parent opens `/billing`.
2. The parent selects `Monthly` or `Yearly`.
3. The browser calls a new authenticated route that creates a Stripe Checkout Session.
4. The route saves the selected plan, creates or reuses a Stripe customer, and returns the hosted Checkout URL.
5. The browser redirects to Stripe Checkout.
6. Stripe sends the parent back to a Daily Sparks success page with `session_id`.
7. The success page verifies the Checkout Session server-side and updates the parent record.

## Data Model

Extend the parent record with Stripe-specific fields:

- `stripeCustomerId`
- `stripeSubscriptionId`

The existing fields stay in place:

- `subscriptionStatus`
- `subscriptionPlan`

This keeps billing state in one parent record and avoids introducing a separate billing table for the MVP.

## API Surface

Add:

- `POST /api/billing/checkout`

This route should:

- require a valid parent session
- validate the requested plan
- ensure Stripe is configured
- create or reuse a Stripe customer
- create a Checkout Session with hosted success and cancel URLs
- return the session URL

Add:

- `/billing/success`

This page should:

- require a valid parent session
- read `session_id`
- retrieve the Checkout Session from Stripe
- verify it belongs to the logged-in parent
- update the parent record with Stripe identifiers and `active` status

## Secrets

Use environment variables and Cloud Run secrets only.

Expected server settings:

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

Optional helper flags:

- `NEXT_PUBLIC_STRIPE_SANDBOX=true`

## Security Notes

- Never commit Stripe keys.
- Never send the secret key to the browser.
- Always verify the success `session_id` server-side before updating subscription state.
- Treat the live keys already shared in chat as exposed and rotate them before production use.

## Verification

Add automated coverage for:

- checkout route rejects invalid or unauthenticated requests
- checkout route creates a hosted session URL when configured
- success finalization updates the parent to `active`

Manual smoke should confirm:

- `/billing` loads
- selecting a plan redirects to Stripe sandbox Checkout
- success returns to Daily Sparks and updates the dashboard summary
