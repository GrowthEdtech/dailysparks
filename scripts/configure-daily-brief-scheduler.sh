#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-gen-lang-client-0586185740}"
JOB_NAME="${DAILY_BRIEF_SCHEDULER_JOB_NAME:-dailysparks-daily-brief}"
LOCATION="${DAILY_BRIEF_SCHEDULER_LOCATION:-asia-east2}"
SCHEDULE="${DAILY_BRIEF_SCHEDULER_SCHEDULE:-0 6 * * *}"
TIME_ZONE="${DAILY_BRIEF_SCHEDULER_TIME_ZONE:-Asia/Hong_Kong}"
TARGET_URL="${DAILY_BRIEF_SCHEDULER_TARGET_URL:-https://dailysparks.geledtech.com/api/internal/daily-brief/run}"
HEADER_NAME="${DAILY_BRIEF_SCHEDULER_HEADER_NAME:-x-daily-sparks-scheduler-secret}"
DESCRIPTION="${DAILY_BRIEF_SCHEDULER_DESCRIPTION:-Runs the Daily Sparks ingestion, generation, and delivery pipeline.}"
ATTEMPT_DEADLINE="${DAILY_BRIEF_SCHEDULER_ATTEMPT_DEADLINE:-1200s}"
MAX_RETRY_ATTEMPTS="${DAILY_BRIEF_SCHEDULER_MAX_RETRY_ATTEMPTS:-0}"
MESSAGE_BODY="${DAILY_BRIEF_SCHEDULER_MESSAGE_BODY:-{}}"
SCHEDULER_SECRET="${DAILY_SPARKS_SCHEDULER_SECRET:-}"
SCHEDULER_SECRET_SECRET="${DAILY_SPARKS_SCHEDULER_SECRET_SECRET:-}"

if [[ -z "${SCHEDULER_SECRET}" ]] && [[ -n "${SCHEDULER_SECRET_SECRET}" ]]; then
  SCHEDULER_SECRET="$(
    gcloud secrets versions access latest \
      --secret "${SCHEDULER_SECRET_SECRET}" \
      --project "${PROJECT_ID}"
  )"
fi

if [[ -z "${SCHEDULER_SECRET}" ]]; then
  echo "Provide DAILY_SPARKS_SCHEDULER_SECRET or DAILY_SPARKS_SCHEDULER_SECRET_SECRET before configuring Cloud Scheduler." >&2
  exit 1
fi

COMMON_ARGS=(
  --project "${PROJECT_ID}"
  --location "${LOCATION}"
  --schedule "${SCHEDULE}"
  --time-zone "${TIME_ZONE}"
  --uri "${TARGET_URL}"
  --http-method POST
  --message-body "${MESSAGE_BODY}"
  --attempt-deadline "${ATTEMPT_DEADLINE}"
  --max-retry-attempts "${MAX_RETRY_ATTEMPTS}"
  --description "${DESCRIPTION}"
)

if gcloud scheduler jobs describe "${JOB_NAME}" \
  --project "${PROJECT_ID}" \
  --location "${LOCATION}" >/dev/null 2>&1; then
  gcloud scheduler jobs update http "${JOB_NAME}" \
    "${COMMON_ARGS[@]}" \
    --update-headers "${HEADER_NAME}=${SCHEDULER_SECRET},Content-Type=application/json" \
    --clear-auth-token

  echo "Updated Cloud Scheduler job: ${JOB_NAME}"
else
  gcloud scheduler jobs create http "${JOB_NAME}" \
    "${COMMON_ARGS[@]}" \
    --headers "${HEADER_NAME}=${SCHEDULER_SECRET},Content-Type=application/json"

  echo "Created Cloud Scheduler job: ${JOB_NAME}"
fi

echo "Target URL: ${TARGET_URL}"
echo "Schedule: ${SCHEDULE} (${TIME_ZONE})"
echo "Project / location: ${PROJECT_ID} / ${LOCATION}"
