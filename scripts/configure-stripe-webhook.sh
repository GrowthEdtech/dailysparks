#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-gen-lang-client-0586185740}"
WEBHOOK_URL="${WEBHOOK_URL:-https://dailysparks.geledtech.com/api/stripe/webhook}"
STRIPE_MODE="${STRIPE_MODE:-test}"
DEFAULT_WEBHOOK_SECRET_NAME="daily-sparks-stripe-${STRIPE_MODE}-webhook-secret"
STRIPE_WEBHOOK_SECRET_SECRET="${STRIPE_WEBHOOK_SECRET_SECRET:-${DEFAULT_WEBHOOK_SECRET_NAME}}"
STRIPE_API_KEY="${STRIPE_API_KEY:-}"

if [[ "${STRIPE_MODE}" != "test" ]] && [[ "${STRIPE_MODE}" != "live" ]]; then
  echo "STRIPE_MODE must be either test or live." >&2
  exit 1
fi

if [[ -z "${STRIPE_API_KEY}" ]]; then
  echo "STRIPE_API_KEY is required." >&2
  exit 1
fi

EXISTING_ENDPOINT_ID="$(
  curl -sS https://api.stripe.com/v1/webhook_endpoints \
    -u "${STRIPE_API_KEY}:" | jq -r --arg url "${WEBHOOK_URL}" '.data[]? | select(.url == $url) | .id' | head -n 1
)"

if [[ -n "${EXISTING_ENDPOINT_ID}" ]] && gcloud secrets describe "${STRIPE_WEBHOOK_SECRET_SECRET}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  echo "Stripe webhook already configured: ${EXISTING_ENDPOINT_ID}"
  echo "Secret Manager secret is already present: ${STRIPE_WEBHOOK_SECRET_SECRET}"
  exit 0
fi

CREATE_RESPONSE="$(
  curl -sS https://api.stripe.com/v1/webhook_endpoints \
    -u "${STRIPE_API_KEY}:" \
    --data-urlencode "url=${WEBHOOK_URL}" \
    -d "enabled_events[]=checkout.session.completed" \
    -d "enabled_events[]=invoice.paid" \
    -d "enabled_events[]=invoice.payment_failed" \
    -d "enabled_events[]=customer.subscription.updated" \
    -d "enabled_events[]=customer.subscription.deleted"
)"

WEBHOOK_ID="$(printf '%s' "${CREATE_RESPONSE}" | jq -r '.id // empty')"
WEBHOOK_SECRET="$(printf '%s' "${CREATE_RESPONSE}" | jq -r '.secret // empty')"
STRIPE_ERROR="$(printf '%s' "${CREATE_RESPONSE}" | jq -r '.error.message // empty')"

if [[ -z "${WEBHOOK_ID}" ]] || [[ -z "${WEBHOOK_SECRET}" ]]; then
  echo "Failed to create Stripe webhook endpoint." >&2
  if [[ -n "${STRIPE_ERROR}" ]]; then
    echo "${STRIPE_ERROR}" >&2
  fi
  exit 1
fi

TMP_SECRET_FILE="$(mktemp)"
trap 'rm -f "${TMP_SECRET_FILE}"' EXIT
printf '%s' "${WEBHOOK_SECRET}" > "${TMP_SECRET_FILE}"

if gcloud secrets describe "${STRIPE_WEBHOOK_SECRET_SECRET}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud secrets versions add "${STRIPE_WEBHOOK_SECRET_SECRET}" \
    --project "${PROJECT_ID}" \
    --data-file="${TMP_SECRET_FILE}" >/dev/null
else
  gcloud secrets create "${STRIPE_WEBHOOK_SECRET_SECRET}" \
    --project "${PROJECT_ID}" \
    --replication-policy="automatic" \
    --data-file="${TMP_SECRET_FILE}" >/dev/null
fi

echo "Created Stripe webhook endpoint: ${WEBHOOK_ID}"
echo "Stored signing secret in Secret Manager: ${STRIPE_WEBHOOK_SECRET_SECRET}"
echo "Stripe mode: ${STRIPE_MODE}"
