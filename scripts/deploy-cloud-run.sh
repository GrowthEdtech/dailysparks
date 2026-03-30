#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-gen-lang-client-0586185740}"
SERVICE_NAME="${SERVICE_NAME:-dailysparks-web}"
REGION="${REGION:-asia-east2}"
REPOSITORY="${REPOSITORY:-cloud-run-source-deploy}"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE_NAME}:$(git rev-parse --short HEAD)"

echo "Building image: ${IMAGE}"
gcloud builds submit --tag "${IMAGE}"

echo "Deploying service: ${SERVICE_NAME}"
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE}" \
  --platform managed \
  --region "${REGION}" \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,DAILY_SPARKS_STORE_BACKEND=firestore,FIREBASE_PROJECT_ID=${PROJECT_ID}"
