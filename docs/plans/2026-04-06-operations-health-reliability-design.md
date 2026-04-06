# Operations Health Reliability Design

## Goal

Add a reliability layer that makes Daily Sparks operationally observable, alertable, and self-healing across:

- Daily Brief production
- Planned notification delivery
- GEO monitoring
- Billing reconciliation backstops

## Why now

The underlying systems already have immutable evidence stores, but operations still need to jump across multiple tabs and infer whether the platform is healthy. Recent production misses showed that we need a top-level control plane that can:

- summarize system health in one place
- emit explicit SLA alerts
- run safe remediation actions without waiting for manual intervention

## Recommended approach

Create a new `Operations Health` admin workspace backed by an immutable `operationsHealthRuns` store and a dedicated internal runner.

This is better than folding the work into `Users` or `Daily Briefs` because:

- reliability signals cut across editorial, billing, notifications, and GEO
- the control plane needs its own recent-run evidence and remediation history
- it keeps existing operational tabs focused on their domain workflows

## Scope

### 1. Operations health dashboard

Create a new admin tab and page:

- `/admin/editorial/operations-health`

The page should show:

- overall health status
- Daily Brief health
- planned notification health
- GEO monitoring health
- billing notification backstop health
- recent alerts
- recent remediation actions
- recent operations-health runs

### 2. Alerting / SLA policy

Use a single policy layer to turn evidence into alerts.

Initial alert rules:

- `critical`: missing expected production brief records for the current run date
- `warning`: retry-eligible Daily Brief failures exist
- `warning`: notification queue has items older than 72h or escalated items
- `warning`: latest GEO run is stale, partial, or timed out
- `warning`: billing-status notifications have actionable unresolved backlog

Alerts should be:

- embedded in immutable operations-health run history
- optionally emitted to a webhook
- visible in the admin dashboard

### 3. Auto-remediation workflows

The internal runner should safely trigger existing workflows:

- `retry-delivery` when Daily Brief retry candidates exist
- `growth-reconciliation` when planned notification backlog needs automated retry/backfill
- `geo-monitoring` when GEO is stale or the latest run is unhealthy

The runner must be fail-open:

- each remediation action records success or failure independently
- one failed remediation does not block the rest of the cycle

## Data model

Add an immutable `OperationsHealthRunRecord` with:

- `source`: `scheduled | manual`
- `status`: `healthy | warning | critical`
- `runDate`
- aggregate summaries for `dailyBrief`, `notifications`, `geo`, `billing`
- `alerts[]`
- `remediationActions[]`
- `startedAt`, `completedAt`

This record becomes the source of truth for:

- current health snapshot rendering
- recent alert evidence
- recent self-healing evidence

## Route design

Add:

- internal route: `/api/internal/operations-health/run`
- admin route: `/api/admin/operations-health/run`

The internal route uses the scheduler secret.
The admin route uses editorial admin auth.

Both call the same shared runner.

## Scheduler

Add a daily scheduler job after the existing morning reliability passes:

- after growth reconciliation
- after GEO monitoring

Recommended initial time:

- `08:00 Asia/Hong_Kong`

## Non-goals

This phase does not:

- replace existing domain-specific admin tabs
- add new notification families
- introduce cross-service messaging infrastructure
- auto-remediate escalated manual-intervention items

## Success criteria

- operations can open one page and understand platform health within seconds
- health runs leave immutable evidence
- daily brief retry, notification backfill, and GEO rerun can happen automatically
- alert conditions are explicit instead of inferred from scattered UI states
