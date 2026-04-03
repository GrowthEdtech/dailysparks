# Daily Brief Staged Scheduler Design

## Goal

Replace the current single-shot daily automation flow with a staged scheduler
model that separates:

- source ingestion
- programme-aware generation and PDF preparation
- delivery preflight
- official dispatch
- delivery retry

This design is intended to support a reliable `09:00` family-facing delivery
time in `Asia/Hong_Kong`.

## Why The Current Shape Is Not Enough

The current production scheduler defaults to one Cloud Scheduler job at `06:00`
Hong Kong time and targets a single internal route:

- `scripts/configure-daily-brief-scheduler.sh`
- `src/app/api/internal/daily-brief/run/route.ts`

That model is acceptable for MVP automation, but it combines too many concerns
into one run:

- fetching source candidates
- selecting the day topic
- generating `PYP / MYP / DP`
- writing history
- delivering to Goodnotes and Notion

If any one of those stages slows down or fails, the entire send window is put at
risk. For a product that behaves like a daily paper, delivery should be treated
as a separate SLA event, not as the last step of a long background job.

## Recommended Architecture

Adopt a **three-stage operational model** with dedicated routes and scheduler
jobs:

1. `Ingestion window`
2. `Generation window`
3. `Delivery window`

The recommended schedule is:

- `01:00` ingestion refresh #1
- `03:00` ingestion refresh #2
- `05:00` ingestion refresh #3
- `06:00` final selection + generation + PDF build
- `08:50` delivery preflight
- `09:00` official dispatch
- `09:10` retry failed deliveries only

This yields three operational guarantees:

- morning content reflects fresh overnight sources
- generation is finished before the send SLA
- delivery is no longer blocked by content generation latency

## Operational Model

### Stage 1: Ingestion

The ingestion stage should:

- fetch and normalize candidate metadata from active feed-backed sources
- deduplicate by normalized URL and normalized title
- write a **candidate snapshot** for the day
- remain idempotent for repeated runs during the same morning

The ingestion stage should **not** generate content or send anything.

### Stage 2: Generation

The generation stage should:

- read the latest candidate snapshot
- select the day topic universe
- generate `PYP / MYP / DP` only for programmes with eligible recipients
- build and persist final brief content
- build delivery-ready artifacts, including PDF content
- update history into a pre-delivery state

The generation stage should freeze the day topic after the `06:00` run so later
delivery jobs do not shift the content unexpectedly.

### Stage 3: Delivery

The delivery stage should:

- read only briefs already generated for the day
- dispatch them to configured channels
- record per-channel delivery success and failure
- avoid any new content generation

This is what protects the `09:00` send time.

## Route Split

The current fallback route:

- `/api/internal/daily-brief/run`

should remain available for operator-triggered end-to-end orchestration, but the
primary scheduler jobs should target dedicated stage routes:

- `/api/internal/daily-brief/ingest`
- `/api/internal/daily-brief/generate`
- `/api/internal/daily-brief/preflight`
- `/api/internal/daily-brief/deliver`
- `/api/internal/daily-brief/retry-delivery`

### Route responsibilities

`ingest`
- authenticated by the existing scheduler secret header
- fetch active source feeds
- write/update the candidate snapshot for the run date
- return counts and source-level diagnostics

`generate`
- load candidate snapshot
- select topic
- generate programme-specific briefs
- build PDF-ready artifacts
- write history records in a ready-to-deliver state

`preflight`
- verify the day has:
  - a candidate snapshot
  - generated brief records
  - PDF-ready artifacts
  - a valid active prompt policy
  - a valid default AI connection
  - eligible recipients
- block dispatch when any requirement is missing

`deliver`
- send generated briefs to Goodnotes and Notion
- do not call the model
- do not re-run source ingestion

`retry-delivery`
- retry only failed recipient-channel pairs
- use the same generated brief artifacts
- stop after the retry window closes

`run`
- remain as a manual operator fallback
- optionally support a `mode` argument to call stage handlers in sequence
- should no longer be the primary scheduled path

## Job Naming

Use explicit job names rather than a single generic scheduler entry.

Recommended names:

- `dailysparks-brief-ingest-0100`
- `dailysparks-brief-ingest-0300`
- `dailysparks-brief-ingest-0500`
- `dailysparks-brief-generate-0600`
- `dailysparks-brief-preflight-0850`
- `dailysparks-brief-deliver-0900`
- `dailysparks-brief-retry-0910`

This makes operator debugging and scheduler dashboards much easier to reason
about than a single `dailysparks-daily-brief` job.

## New Persistence Layer

The staged model needs a **candidate snapshot store** in addition to the
existing daily brief history store.

Recommended additions:

- `src/lib/daily-brief-candidate-schema.ts`
- `src/lib/daily-brief-candidate-store.ts`
- `src/lib/local-daily-brief-candidate-store.ts`
- `src/lib/firestore-daily-brief-candidate-store.ts`

Suggested candidate snapshot fields:

- `id`
- `scheduledFor`
- `createdAt`
- `updatedAt`
- `sourceRefreshCount`
- `sourceIds`
- `candidateCount`
- `candidates`
- `selectionFrozenAt`
- `selectionStatus`
- `notes`

This snapshot becomes the shared handoff between ingestion and generation.

## History State Model

The current daily brief history schema only has:

- `draft`
- `approved`
- `published`
- `failed`

Those statuses are not expressive enough for a staged scheduler unless they are
paired with a more detailed pipeline state.

### Recommended strategy

Keep the existing top-level `status` values for backwards compatibility, but
add a new `pipelineStage` field.

Recommended `pipelineStage` values:

- `ingested`
- `generated`
- `pdf_built`
- `preflight_passed`
- `delivering`
- `published`
- `failed`

Add operational timestamps and counters:

- `candidateSnapshotAt`
- `generationCompletedAt`
- `pdfBuiltAt`
- `deliveryWindowAt`
- `lastDeliveryAttemptAt`
- `deliveryAttemptCount`
- `deliverySuccessCount`
- `deliveryFailureCount`
- `failureReason`
- `retryEligibleUntil`

### Status semantics

`draft`
- generation completed, but dispatch has not happened yet

`approved`
- preflight passed and the brief is eligible for dispatch

`published`
- at least one configured delivery channel succeeded and the dispatch window is complete

`failed`
- generation failed, preflight blocked, or all configured delivery attempts failed

## Retry Rules

### Ingestion

- no immediate retry loop inside a single run
- rely on the next scheduled ingestion refresh

### Generation

- automatic retry up to `2` times
- cutoff window closes at `08:00`
- if still failing after cutoff, mark the brief `failed` and stop

### Preflight

- no generation is allowed here
- if preflight fails, it blocks `09:00` delivery
- the failure should be recorded with a clear blocker summary

### Delivery

- official dispatch happens once at `09:00`
- retry route runs at `09:10`
- optional second retry can be added later if needed
- no retry should occur after the configured `retryEligibleUntil`

### Partial delivery behavior

- if at least one configured channel succeeds, the brief may still become `published`
- failures must still be recorded in counters and notes
- if all configured channels fail, the brief becomes `failed`

## Observability

The staged scheduler should make production state easier to inspect, not harder.

That means:

- scheduler responses should be structured JSON
- each route should report run date, counts, blockers, and duration-friendly fields
- `Daily Briefs` admin should eventually display `pipelineStage` and delivery counters

This is especially important because the new design trades one simple job for
multiple clearer but coordinated jobs.

## Backwards Compatibility

To reduce rollout risk:

- keep `/api/internal/daily-brief/run` available
- keep existing status values
- add new fields in a backward-compatible way
- reuse the existing scheduler secret auth
- reuse the existing source, AI connection, prompt policy, and profile stores

## Recommended Rollout Order

1. add candidate snapshot persistence
2. add stage-specific routes
3. extend history schema with pipeline state
4. update scheduler script for multi-job support
5. add retry and preflight logic
6. update admin visibility for the new state model

## Success Criteria

This design is successful when:

- the system can ingest sources multiple times before dawn
- the day topic is frozen by `06:00`
- all PDFs and generated briefs are ready before `09:00`
- `09:00` dispatch can run without calling the model
- operators can tell whether a failure happened during ingestion, generation, preflight, or delivery
