# Global Editorial Production Waves

> Superseded by timezone-cohort editions. Keep this record for historical context.

## Goal

Protect the `09:00 local` delivery promise for global families without forcing
the whole editorial day to depend on a single `06:00 Asia/Hong_Kong` batch.

## Decision

This document captured the interim `single-edition early + backstop` model.
Daily Sparks has now moved to explicit timezone-cohort editions instead:

- `02:00 / 02:15 Asia/Hong_Kong`: `APAC`
- `04:00 / 04:15 Asia/Hong_Kong`: `EMEA`
- `06:00 / 06:15 Asia/Hong_Kong`: `AMER`

Each cohort now generates its own brief edition while reusing the same locked
global topic from the candidate snapshot.

## Business Rules

1. Ingestion may keep refreshing candidate feeds while the snapshot is still
   open.
2. A candidate snapshot only freezes after a generation wave actually creates
   briefs.
3. Once the snapshot is frozen, later ingestion jobs do not overwrite it.
4. Later preflight waves treat already-approved or already-published briefs as a
   successful no-op rather than a blocker.

## Why this change

The single-edition model reduced the first-wave risk, but it still forced all
regions to share the same generated brief record. Cohort editions provide a
better balance:

- one locked global topic per day
- separate `APAC / EMEA / AMER` brief editions
- clearer admin/history observability
- room for future regional freshness without diverging the editorial theme

## Files touched

- `src/app/api/internal/daily-brief/ingest/route.ts`
- `src/app/api/internal/daily-brief/generate/route.ts`
- `src/app/api/internal/daily-brief/preflight/route.ts`
- `src/lib/daily-brief-cohorts.ts`
- `src/lib/daily-brief-candidate-schema.ts`
- `src/lib/daily-brief-history-schema.ts`
- `scripts/configure-daily-brief-scheduler.sh`
- `README.md`
- `docs/plans/2026-04-03-daily-brief-operations-runbook.md`

## Verification target

- frozen snapshots are not overwritten by later ingestion jobs
- later cohorts reuse the locked topic rather than reselecting a topic
- repeated cohort preflight waves are idempotent once that cohort is already approved
