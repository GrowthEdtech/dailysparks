# GEO Monitoring Async Job + Query Diagnostics Implementation Plan

## Phase 1: Contract and Store

1. Extend run statuses with `queued`/`running`.
2. Add a query diagnostic schema to `GeoMonitoringRunRecord`.
3. Add `updateGeoMonitoringRun` and implement it for local JSON and Firestore stores.
4. Normalize old records so missing `queryDiagnostics` becomes `[]`.

## Phase 2: Runner

1. Let `runGeoMonitoring` accept an optional `runId` and `persistMode`.
2. Measure every engine check duration inside the existing bounded concurrency mapper.
3. Append diagnostics for success, skipped, and failed outcomes.
4. Persist final run data via create mode for existing callers and update mode for async admin jobs.

## Phase 3: Admin Async Route

1. Authenticate as before.
2. Create a `running` manual run record immediately.
3. Schedule `runGeoMonitoring({ source: "manual", runId, persistMode: "update" })` with `after()`.
4. Return `202` with the queued run and no required logs payload.

## Phase 4: Admin UI

1. Accept optional logs/readability status in the manual run response.
2. Show a clear in-progress message for async runs.
3. Render query diagnostic summaries and top rows inside recent run cards.

## Verification

1. Run targeted GEO monitoring tests.
2. Run lint, full tests, and build.
3. Push/deploy, then perform live admin smoke to confirm the route returns quickly and the run completes in Firestore.
