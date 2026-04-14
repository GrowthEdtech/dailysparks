#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-gen-lang-client-0586185740}"
STRIPE_LIVE_SECRET_NAME="${STRIPE_LIVE_SECRET_NAME:-daily-sparks-stripe-live-secret-key}"
STRIPE_LIVE_WEBHOOK_SECRET_NAME="${STRIPE_LIVE_WEBHOOK_SECRET_NAME:-daily-sparks-stripe-live-webhook-secret}"

STRIPE_API_KEY="$(
  gcloud secrets versions access latest \
    --secret "${STRIPE_LIVE_SECRET_NAME}" \
    --project "${PROJECT_ID}"
)"

if [[ -z "${STRIPE_API_KEY}" ]]; then
  echo "Live Stripe API key secret is empty: ${STRIPE_LIVE_SECRET_NAME}" >&2
  exit 1
fi

STRIPE_MODE=live \
STRIPE_API_KEY="${STRIPE_API_KEY}" \
STRIPE_WEBHOOK_SECRET_SECRET="${STRIPE_LIVE_WEBHOOK_SECRET_NAME}" \
bash "$(dirname "$0")/configure-stripe-webhook.sh"
