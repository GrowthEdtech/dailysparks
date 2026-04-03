#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-gen-lang-client-0586185740}"
LOCATION="${DAILY_BRIEF_SCHEDULER_LOCATION:-asia-east2}"
TIME_ZONE="${DAILY_BRIEF_SCHEDULER_TIME_ZONE:-Asia/Hong_Kong}"
BASE_URL="${DAILY_BRIEF_SCHEDULER_BASE_URL:-https://dailysparks.geledtech.com}"
HEADER_NAME="${DAILY_BRIEF_SCHEDULER_HEADER_NAME:-x-daily-sparks-scheduler-secret}"
DEFAULT_ATTEMPT_DEADLINE="${DAILY_BRIEF_SCHEDULER_ATTEMPT_DEADLINE:-1200s}"
DEFAULT_MAX_RETRY_ATTEMPTS="${DAILY_BRIEF_SCHEDULER_MAX_RETRY_ATTEMPTS:-0}"
DEFAULT_MESSAGE_BODY="${DAILY_BRIEF_SCHEDULER_MESSAGE_BODY:-{}}"
JOB_PREFIX="${DAILY_BRIEF_SCHEDULER_JOB_PREFIX:-dailysparks-brief}"
LEGACY_JOB_NAME="${DAILY_BRIEF_SCHEDULER_LEGACY_JOB_NAME:-dailysparks-daily-brief}"
CLEANUP_LEGACY_JOB="${DAILY_BRIEF_SCHEDULER_CLEANUP_LEGACY_JOB:-true}"
INGEST_0100_SCHEDULE="${DAILY_BRIEF_SCHEDULER_INGEST_0100_SCHEDULE:-0 1 * * *}"
INGEST_0300_SCHEDULE="${DAILY_BRIEF_SCHEDULER_INGEST_0300_SCHEDULE:-0 3 * * *}"
INGEST_0500_SCHEDULE="${DAILY_BRIEF_SCHEDULER_INGEST_0500_SCHEDULE:-0 5 * * *}"
GENERATE_0600_SCHEDULE="${DAILY_BRIEF_SCHEDULER_GENERATE_0600_SCHEDULE:-0 6 * * *}"
PREFLIGHT_0850_SCHEDULE="${DAILY_BRIEF_SCHEDULER_PREFLIGHT_0850_SCHEDULE:-50 8 * * *}"
DELIVER_0900_SCHEDULE="${DAILY_BRIEF_SCHEDULER_DELIVER_0900_SCHEDULE:-0 9 * * *}"
RETRY_0910_SCHEDULE="${DAILY_BRIEF_SCHEDULER_RETRY_0910_SCHEDULE:-10 9 * * *}"
SCHEDULER_SECRET="${DAILY_SPARKS_SCHEDULER_SECRET:-}"
SCHEDULER_SECRET_SECRET="${DAILY_SPARKS_SCHEDULER_SECRET_SECRET:-}"

strip_trailing_slash() {
  local value="$1"
  printf '%s' "${value%/}"
}

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

BASE_URL="$(strip_trailing_slash "${BASE_URL}")"

build_uri() {
  local path="$1"
  printf '%s%s' "${BASE_URL}" "${path}"
}

upsert_http_job() {
  local job_name="$1"
  local schedule="$2"
  local target_path="$3"
  local description="$4"
  local message_body="$5"
  local attempt_deadline="$6"
  local max_retry_attempts="$7"
  local target_url
  target_url="$(build_uri "${target_path}")"

  local common_args=(
    --project "${PROJECT_ID}"
    --location "${LOCATION}"
    --schedule "${schedule}"
    --time-zone "${TIME_ZONE}"
    --uri "${target_url}"
    --http-method POST
    --message-body "${message_body}"
    --attempt-deadline "${attempt_deadline}"
    --max-retry-attempts "${max_retry_attempts}"
    --description "${description}"
  )

  if gcloud scheduler jobs describe "${job_name}" \
    --project "${PROJECT_ID}" \
    --location "${LOCATION}" >/dev/null 2>&1; then
    gcloud scheduler jobs update http "${job_name}" \
      "${common_args[@]}" \
      --update-headers "${HEADER_NAME}=${SCHEDULER_SECRET},Content-Type=application/json" \
      --clear-auth-token

    echo "Updated Cloud Scheduler job: ${job_name} -> ${target_url}"
  else
    gcloud scheduler jobs create http "${job_name}" \
      "${common_args[@]}" \
      --headers "${HEADER_NAME}=${SCHEDULER_SECRET},Content-Type=application/json"

    echo "Created Cloud Scheduler job: ${job_name} -> ${target_url}"
  fi
}

JOB_SPECS=(
  "${JOB_PREFIX}-ingest-0100|${INGEST_0100_SCHEDULE}|/api/internal/daily-brief/ingest|Refresh the Daily Sparks candidate snapshot for the 01:00 ingestion window.|${DEFAULT_MESSAGE_BODY}|${DEFAULT_ATTEMPT_DEADLINE}|${DEFAULT_MAX_RETRY_ATTEMPTS}"
  "${JOB_PREFIX}-ingest-0300|${INGEST_0300_SCHEDULE}|/api/internal/daily-brief/ingest|Refresh the Daily Sparks candidate snapshot for the 03:00 ingestion window.|${DEFAULT_MESSAGE_BODY}|${DEFAULT_ATTEMPT_DEADLINE}|${DEFAULT_MAX_RETRY_ATTEMPTS}"
  "${JOB_PREFIX}-ingest-0500|${INGEST_0500_SCHEDULE}|/api/internal/daily-brief/ingest|Refresh the Daily Sparks candidate snapshot for the 05:00 ingestion window.|${DEFAULT_MESSAGE_BODY}|${DEFAULT_ATTEMPT_DEADLINE}|${DEFAULT_MAX_RETRY_ATTEMPTS}"
  "${JOB_PREFIX}-generate-0600|${GENERATE_0600_SCHEDULE}|/api/internal/daily-brief/generate|Generate and freeze the Daily Sparks programme briefs for the day.|${DEFAULT_MESSAGE_BODY}|${DEFAULT_ATTEMPT_DEADLINE}|${DEFAULT_MAX_RETRY_ATTEMPTS}"
  "${JOB_PREFIX}-preflight-0850|${PREFLIGHT_0850_SCHEDULE}|/api/internal/daily-brief/preflight|Run delivery preflight checks before the 09:00 Daily Sparks dispatch window.|${DEFAULT_MESSAGE_BODY}|${DEFAULT_ATTEMPT_DEADLINE}|${DEFAULT_MAX_RETRY_ATTEMPTS}"
  "${JOB_PREFIX}-deliver-0900|${DELIVER_0900_SCHEDULE}|/api/internal/daily-brief/deliver|Dispatch approved Daily Sparks briefs to Goodnotes and Notion at 09:00.|${DEFAULT_MESSAGE_BODY}|${DEFAULT_ATTEMPT_DEADLINE}|${DEFAULT_MAX_RETRY_ATTEMPTS}"
  "${JOB_PREFIX}-retry-0910|${RETRY_0910_SCHEDULE}|/api/internal/daily-brief/retry-delivery|Retry failed Daily Sparks recipient-channel deliveries after the dispatch wave.|${DEFAULT_MESSAGE_BODY}|${DEFAULT_ATTEMPT_DEADLINE}|${DEFAULT_MAX_RETRY_ATTEMPTS}"
)

for spec in "${JOB_SPECS[@]}"; do
  IFS='|' read -r job_name schedule target_path description message_body attempt_deadline max_retry_attempts <<<"${spec}"
  upsert_http_job \
    "${job_name}" \
    "${schedule}" \
    "${target_path}" \
    "${description}" \
    "${message_body}" \
    "${attempt_deadline}" \
    "${max_retry_attempts}"
done

if [[ "${CLEANUP_LEGACY_JOB}" == "true" ]] && [[ -n "${LEGACY_JOB_NAME}" ]]; then
  if gcloud scheduler jobs describe "${LEGACY_JOB_NAME}" \
    --project "${PROJECT_ID}" \
    --location "${LOCATION}" >/dev/null 2>&1; then
    gcloud scheduler jobs delete "${LEGACY_JOB_NAME}" \
      --project "${PROJECT_ID}" \
      --location "${LOCATION}" \
      --quiet

    echo "Deleted legacy Cloud Scheduler job: ${LEGACY_JOB_NAME}"
  fi
fi

echo "Project / location: ${PROJECT_ID} / ${LOCATION}"
echo "Time zone: ${TIME_ZONE}"
echo "Base URL: ${BASE_URL}"
echo "Job prefix: ${JOB_PREFIX}"
