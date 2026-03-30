#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-gen-lang-client-0586185740}"
DISPLAY_NAME="${DISPLAY_NAME:-Daily Sparks Production HTTPS}"
HOSTNAME="${HOSTNAME:-dailysparks.geledtech.com}"

existing_config="$(
  gcloud monitoring uptime list-configs \
    --project "${PROJECT_ID}" \
    --format="value(name)" \
    --filter="displayName='${DISPLAY_NAME}'" | head -n 1
)"

if [[ -n "${existing_config}" ]]; then
  echo "Uptime check already exists: ${existing_config}"
  exit 0
fi

gcloud monitoring uptime create "${DISPLAY_NAME}" \
  --project "${PROJECT_ID}" \
  --resource-type=uptime-url \
  --resource-labels="project_id=${PROJECT_ID},host=${HOSTNAME}" \
  --protocol=https \
  --path=/ \
  --period=1 \
  --timeout=10 \
  --validate-ssl=true
