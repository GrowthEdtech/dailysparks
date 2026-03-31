#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-gen-lang-client-0586185740}"
BACKEND_SERVICE_NAME="${BACKEND_SERVICE_NAME:-dailysparks-web-backend}"
HEADER_NAME="${HEADER_NAME:-X-Client-Country}"

gcloud compute backend-services update "${BACKEND_SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --global \
  --custom-request-header="${HEADER_NAME}:{client_region}"

echo "Configured ${HEADER_NAME} geolocation header on ${BACKEND_SERVICE_NAME}."
