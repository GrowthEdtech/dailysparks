#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-gen-lang-client-0586185740}"
SERVICE_NAME="${SERVICE_NAME:-dailysparks-web}"
REGION="${REGION:-asia-east2}"
REPOSITORY="${REPOSITORY:-cloud-run-source-deploy}"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE_NAME}:$(git rev-parse --short HEAD)"
ENV_VARS="NODE_ENV=production,DAILY_SPARKS_STORE_BACKEND=firestore,FIREBASE_PROJECT_ID=${PROJECT_ID}"

if [[ -n "${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-}" ]]; then
  ENV_VARS="${ENV_VARS},NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}"
fi

echo "Building image: ${IMAGE}"
gcloud builds submit --tag "${IMAGE}"

echo "Deploying service: ${SERVICE_NAME}"
DEPLOY_ARGS=(
  --image "${IMAGE}"
  --platform managed
  --region "${REGION}"
  --ingress internal-and-cloud-load-balancing
  --allow-unauthenticated
  --set-env-vars "${ENV_VARS}"
)

if [[ -n "${STRIPE_SECRET_KEY_SECRET:-}" ]]; then
  DEPLOY_ARGS+=(--update-secrets "STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY_SECRET}:latest")
fi

if [[ -n "${STRIPE_WEBHOOK_SECRET_SECRET:-}" ]]; then
  DEPLOY_ARGS+=(--update-secrets "STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET_SECRET}:latest")
fi

gcloud run deploy "${SERVICE_NAME}" \
  "${DEPLOY_ARGS[@]}"
