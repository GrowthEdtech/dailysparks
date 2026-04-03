# Daily Brief Operations Runbook

## Goal

Keep the staged daily brief pipeline reliable enough to meet the `09:00`
delivery SLA for production families.

## Stage schedule

All times below are `Asia/Hong_Kong`.

- `01:00` `ingest` refresh #1
- `02:00` `generate` APAC cohort edition
- `02:15` `preflight` APAC cohort edition
- `03:00` `ingest` refresh #2
- `04:00` `generate` EMEA cohort edition
- `04:15` `preflight` EMEA cohort edition
- `05:00` `ingest` refresh #3
- `06:00` `generate` AMER cohort edition
- `06:15` `preflight` AMER cohort edition
- every `30` minutes `deliver`
- every `30` minutes offset by `10` minutes `retry-delivery`

## Dispatch modes

### Full delivery

```env
DAILY_BRIEF_DELIVERY_MODE=all
```

Use this after the pipeline has already passed canary validation.

### Canary delivery

```env
DAILY_BRIEF_DELIVERY_MODE=canary
DAILY_BRIEF_CANARY_PARENT_EMAILS=first-family@example.com,second-family@example.com
```

Use canary mode whenever you introduce one of these changes:

- a new prompt policy version
- a new AI connection
- delivery logic changes
- scheduler / staged route changes

Recommended canary size:

- `1-3` real families

Exit canary mode only after:

- `generate` succeeds
- `preflight` succeeds
- `deliver` publishes successfully for the canary set
- `retry-delivery` resolves or clearly documents any residual failures

## Alert routing

Server logs always include structured daily brief alert payloads.

Optional webhook forwarding:

```env
DAILY_BRIEF_OPS_ALERT_WEBHOOK_URL=https://ops.example.com/daily-brief
```

Prefer Secret Manager in production:

```env
DAILY_BRIEF_OPS_ALERT_WEBHOOK_URL_SECRET=daily-brief-ops-alert-webhook
```

## Daily operator checks

### Before 02:00

- Confirm the `ingest` jobs are enabled
- Confirm at least one active source exists in admin
- Confirm the default AI connection is still active
- Confirm the active prompt policy is the intended version

### After 02:15

Open `Daily Briefs` admin and confirm:

- new `APAC` records were created for the target date
- `pipelineStage` is `generated` or `preflight_passed`
- `candidateSnapshotAt` and `generationCompletedAt` are populated
- the selected topic is locked and reused for later cohorts

If not, manually inspect:

- `/api/internal/daily-brief/generate`
- the relevant Cloud Run logs

If the APAC wave succeeds, the later `03:00` and `05:00` ingestion refreshes
should leave the frozen snapshot untouched so the later cohorts reuse the same
topic.

### After 04:15

Confirm:

- the `EMEA` edition exists for the same `runDate`
- it reused the same locked topic as the earlier `APAC` edition
- no unexpected `preflight` blocker alert fired

### After 06:15

Confirm:

- the `AMER` edition exists for the same `runDate`
- it reused the same locked topic as the earlier cohorts
- no unexpected `preflight` blocker alert fired

If preflight blocks:

1. Inspect the blocker summary in the route response or server logs
2. Fix the missing artifact or upstream generation issue
3. Re-run `preflight` manually for the same `runDate`

### Rolling dispatch window

Confirm:

- dispatch reaches the intended canary or full audience
- `deliverySuccessCount` increases
- `pipelineStage` becomes `published` or, in failure cases, `failed`

### Rolling retry window

Confirm:

- retry only targets unresolved recipient-channel failures
- `failedDeliveryTargets` shrinks after retry
- unresolved failures are documented in `adminNotes` and `failureReason`

## Manual route checks

All internal routes require the scheduler secret header:

```bash
x-daily-sparks-scheduler-secret: ${DAILY_SPARKS_SCHEDULER_SECRET}
```

Examples:

```bash
curl -sS -X POST \
  https://dailysparks.geledtech.com/api/internal/daily-brief/preflight \
  -H "content-type: application/json" \
  -H "x-daily-sparks-scheduler-secret: ${DAILY_SPARKS_SCHEDULER_SECRET}" \
  -d '{"runDate":"2026-04-04","editorialCohort":"EMEA"}'
```

```bash
curl -sS -X POST \
  https://dailysparks.geledtech.com/api/internal/daily-brief/deliver \
  -H "content-type: application/json" \
  -H "x-daily-sparks-scheduler-secret: ${DAILY_SPARKS_SCHEDULER_SECRET}" \
  -d '{"runDate":"2026-04-04"}'
```

## Failure handling

### Preflight blocked

- Severity: `critical`
- Primary action: fix missing generation / artifact issue before `09:00`
- Safe fallback: keep the day in canary mode or skip dispatch rather than sending incomplete briefs

### Partial delivery failure

- Severity: `warning`
- Expected outcome: the brief may still be `published`
- Action: let the `09:10` retry run, then inspect any remaining failed targets

### Total delivery failure

- Severity: `critical`
- Expected outcome: brief becomes `failed`
- Action:
  1. inspect delivery channel logs
  2. correct the channel issue
  3. manually re-run `deliver` or `retry-delivery`

### Retry still failing

- Severity: `warning` or `critical`
- Action:
  1. inspect `failedDeliveryTargets`
  2. document the issue in operator notes
  3. decide whether to re-run again manually or follow up outside the system

## Deployment notes

`scripts/deploy-cloud-run.sh` now preserves:

- `DAILY_BRIEF_DELIVERY_MODE`
- `DAILY_BRIEF_CANARY_PARENT_EMAILS`
- `DAILY_BRIEF_OPS_ALERT_WEBHOOK_URL`
- `DAILY_BRIEF_OPS_ALERT_WEBHOOK_URL_SECRET`

This prevents canary and alert settings from being lost on the next production deploy.
