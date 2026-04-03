# Global Editorial Production Waves

## Goal

Protect the `09:00 local` delivery promise for global families without forcing
the whole editorial day to depend on a single `06:00 Asia/Hong_Kong` batch.

## Decision

Daily Sparks now uses a two-wave editorial production model:

- `02:00 / 02:15 Asia/Hong_Kong`: early global generation and preflight
- `06:00 / 06:15 Asia/Hong_Kong`: standard backstop generation and preflight

This is intentionally a **single-edition** model, not two different content
editions for different regions. The early wave exists to make sure families in
`UTC+11` to `UTC+14` can still receive the day’s brief by `09:00 local`. The
standard wave exists as a safety net if the early wave fails or produces no
briefs.

## Business Rules

1. Ingestion may keep refreshing candidate feeds while the snapshot is still
   open.
2. A candidate snapshot only freezes after a generation wave actually creates
   briefs.
3. Once the snapshot is frozen, later ingestion jobs do not overwrite it.
4. Later preflight waves treat already-approved or already-published briefs as a
   successful no-op rather than a blocker.

## Why this shape

This keeps the system operationally simple:

- one brief per programme per day
- no timezone-specific content divergence
- early protection for the eastern-most time zones
- a later backstop if the early wave fails

It also preserves a future upgrade path: if Daily Sparks later wants fresher
content for Europe or the Americas, the next step would be explicit
timezone-cohort editions rather than replacing this early/backstop pattern.

## Files touched

- `src/app/api/internal/daily-brief/ingest/route.ts`
- `src/app/api/internal/daily-brief/generate/route.ts`
- `src/app/api/internal/daily-brief/preflight/route.ts`
- `scripts/configure-daily-brief-scheduler.sh`
- `README.md`
- `docs/plans/2026-04-03-daily-brief-operations-runbook.md`

## Verification target

- frozen snapshots are not overwritten by later ingestion jobs
- failed early generation leaves the snapshot open for the backstop wave
- repeated preflight waves are idempotent once briefs are already approved
