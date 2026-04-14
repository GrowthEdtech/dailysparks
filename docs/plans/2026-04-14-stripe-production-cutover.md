# Stripe Production Cutover

Date: 2026-04-14
Owner: Codex / Growth Education

## Goal

Move Daily Sparks billing from Stripe test mode into Stripe live mode with a controlled production cutover and a real end-to-end payment verification.

## Current production state

- Cloud Run is still bound to test Stripe secrets:
  - `STRIPE_SECRET_KEY -> daily-sparks-stripe-test-secret-key`
  - `STRIPE_WEBHOOK_SECRET -> daily-sparks-stripe-test-webhook-secret`
- Billing UI shows sandbox state whenever `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` starts with `pk_test_`.
- Pricing uses Stripe lookup keys rather than hard-coded price ids:
  - `daily_sparks_monthly`
  - `daily_sparks_yearly`

## Preconditions

Before cutover, prepare the following in Stripe live mode:

1. A live publishable key: `pk_live_...`
2. A live secret key stored in Secret Manager as `daily-sparks-stripe-live-secret-key`
3. Live recurring prices for:
   - `daily_sparks_monthly`
   - `daily_sparks_yearly`
4. Stripe Customer Portal enabled in live mode
5. A webhook endpoint for:
   - `https://dailysparks.geledtech.com/api/stripe/webhook`
6. A live webhook signing secret stored in Secret Manager as `daily-sparks-stripe-live-webhook-secret`

## Recommended cutover sequence

### 1. Sync live prices

Run the managed price sync against the live secret key:

```bash
STRIPE_SECRET_KEY="$(gcloud secrets versions access latest --secret=daily-sparks-stripe-live-secret-key --project=gen-lang-client-0586185740)" \
node --import tsx ./scripts/sync-stripe-pricing.ts
```

Expected result:

- live Stripe has active prices for `daily_sparks_monthly` and `daily_sparks_yearly`
- lookup keys match the app configuration

### 2. Create or refresh the live webhook

```bash
./scripts/configure-stripe-live-webhook.sh
```

Expected result:

- Stripe live endpoint exists for the production webhook URL
- signing secret is stored in Secret Manager

### 3. Deploy Cloud Run with live Stripe config

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..." \
STRIPE_SECRET_KEY_SECRET="daily-sparks-stripe-live-secret-key" \
STRIPE_WEBHOOK_SECRET_SECRET="daily-sparks-stripe-live-webhook-secret" \
bash ./scripts/deploy-cloud-run.sh
```

Expected result:

- billing page no longer shows the `Stripe sandbox` badge
- checkout opens a live Stripe Checkout session

### 4. Run a real payment acceptance test

Use one internal, non-test family account that is safe for real billing.

Verify:

1. `/billing` opens correctly
2. monthly and yearly plans open live Stripe checkout
3. a real subscription completes successfully
4. `/billing/success` confirms the plan
5. Stripe webhook updates parent subscription state to `active`
6. `/billing` shows active subscription state
7. Stripe customer portal opens successfully

### 5. Reconcile invoice history if needed

If any live subscriptions were created before webhook verification is confirmed:

```bash
STRIPE_API_KEY="$(gcloud secrets versions access latest --secret=daily-sparks-stripe-live-secret-key --project=gen-lang-client-0586185740)" \
GOOGLE_CLOUD_PROJECT=gen-lang-client-0586185740 \
npm run backfill:stripe-invoices
```

## Rollback

If live checkout or live webhook verification fails:

1. redeploy Cloud Run with the previous test-mode secret names
2. restore the previous publishable key
3. confirm `/billing` returns to sandbox mode
4. investigate:
   - price lookup keys
   - webhook endpoint configuration
   - portal setup
   - Secret Manager secret contents

## Acceptance checklist

- [ ] Live Stripe prices exist and match lookup keys
- [ ] Live webhook exists and secret stored in Secret Manager
- [ ] Cloud Run uses live publishable key
- [ ] Cloud Run uses live Stripe secret key secret
- [ ] Cloud Run uses live Stripe webhook secret
- [ ] Billing page no longer shows sandbox badge
- [ ] Real checkout succeeds
- [ ] Webhook updates subscription state
- [ ] Portal access works
