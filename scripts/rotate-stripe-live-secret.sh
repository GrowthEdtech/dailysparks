#!/usr/bin/env bash

set -euo pipefail

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-gen-lang-client-0586185740}"
LIVE_SECRET_NAME="${STRIPE_LIVE_SECRET_NAME:-daily-sparks-stripe-live-secret-key}"
LIVE_WEBHOOK_SECRET_NAME="${STRIPE_LIVE_WEBHOOK_SECRET_NAME:-daily-sparks-stripe-live-webhook-secret}"
PUBLISHABLE_KEY="${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-}"
NEW_STRIPE_SECRET_KEY="${NEW_STRIPE_SECRET_KEY:-}"
REFRESH_WEBHOOK="${REFRESH_WEBHOOK:-1}"
SYNC_PRICES="${SYNC_PRICES:-1}"
DEPLOY_LIVE_BILLING="${DEPLOY_LIVE_BILLING:-0}"

if [[ -z "${NEW_STRIPE_SECRET_KEY}" ]]; then
  echo "NEW_STRIPE_SECRET_KEY is required." >&2
  exit 1
fi

if [[ "${NEW_STRIPE_SECRET_KEY}" != sk_live_* ]]; then
  echo "NEW_STRIPE_SECRET_KEY must start with sk_live_." >&2
  exit 1
fi

if [[ "${DEPLOY_LIVE_BILLING}" == "1" && -z "${PUBLISHABLE_KEY}" ]]; then
  echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required when DEPLOY_LIVE_BILLING=1." >&2
  exit 1
fi

printf '%s' "${NEW_STRIPE_SECRET_KEY}" | gcloud secrets versions add "${LIVE_SECRET_NAME}" \
  --project="${PROJECT_ID}" \
  --data-file=-

if [[ "${SYNC_PRICES}" == "1" ]]; then
  STRIPE_SECRET_KEY="${NEW_STRIPE_SECRET_KEY}" \
    node --import tsx ./scripts/sync-stripe-pricing.ts
fi

if [[ "${REFRESH_WEBHOOK}" == "1" ]]; then
  STRIPE_API_KEY="${NEW_STRIPE_SECRET_KEY}" \
  STRIPE_LIVE_SECRET_NAME="${LIVE_SECRET_NAME}" \
  STRIPE_LIVE_WEBHOOK_SECRET_NAME="${LIVE_WEBHOOK_SECRET_NAME}" \
    bash ./scripts/configure-stripe-live-webhook.sh
fi

if [[ "${DEPLOY_LIVE_BILLING}" == "1" ]]; then
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="${PUBLISHABLE_KEY}" \
  STRIPE_SECRET_KEY_SECRET="${LIVE_SECRET_NAME}" \
  STRIPE_WEBHOOK_SECRET_SECRET="${LIVE_WEBHOOK_SECRET_NAME}" \
    bash ./scripts/deploy-cloud-run.sh
fi

echo "Stripe live secret rotation flow completed."
