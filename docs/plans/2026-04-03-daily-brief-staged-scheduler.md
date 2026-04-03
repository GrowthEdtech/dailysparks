# Daily Brief Staged Scheduler Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the current single daily brief scheduler into a staged automation pipeline that separately ingests source candidates, generates finalized programme briefs, and dispatches delivery on a fixed `09:00` schedule.

**Architecture:** Reuse the existing internal scheduler-authenticated route family, but split the responsibilities into dedicated stage handlers. Add a candidate snapshot store for ingestion-to-generation handoff, extend daily brief history with pipeline-stage observability, then update the Cloud Scheduler configuration helper to manage multiple jobs instead of one all-purpose trigger.

**Tech Stack:** Next.js App Router route handlers, TypeScript, existing local/Firestore store pattern, Cloud Scheduler, existing Goodnotes and Notion delivery helpers

---

### Task 1: Add candidate snapshot schema and store tests

**Files:**
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-candidate-schema.ts`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-candidate-store-types.ts`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-candidate-store.ts`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-candidate-store.test.ts`

**Step 1: Write the failing tests**

Cover:

- creating a candidate snapshot for a run date
- overwriting the same run date snapshot idempotently
- loading the latest snapshot for a run date
- returning `null` when no snapshot exists

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/daily-brief-candidate-store.test.ts`

Expected: FAIL because the candidate snapshot schema and store do not exist yet.

**Step 3: Write minimal implementation**

Add:

- candidate snapshot types
- create/get/list helpers
- store selection wrapper using the existing local/Firestore backend pattern

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/daily-brief-candidate-store.test.ts`

Expected: PASS

### Task 2: Add local and Firestore candidate snapshot persistence

**Files:**
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/local-daily-brief-candidate-store.ts`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/firestore-daily-brief-candidate-store.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-candidate-store.ts`

**Step 1: Add local store**

Persist snapshots to a JSON file under `data/` with an env override similar to
the other admin stores.

**Step 2: Add Firestore store**

Persist snapshots under a dedicated collection, for example:

- `dailyBriefCandidateSnapshots`

**Step 3: Re-run store tests**

Run: `npm test -- src/lib/daily-brief-candidate-store.test.ts`

Expected: PASS

### Task 3: Add failing tests for stage route auth and ingestion route

**Files:**
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/ingest/route.ts`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/ingest/route.test.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/source-ingestion.test.ts`

**Step 1: Write the failing tests**

Cover:

- missing scheduler secret returns `503`
- invalid scheduler secret returns `401`
- successful ingest writes a candidate snapshot
- repeated ingest for the same day updates the snapshot instead of duplicating it

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/api/internal/daily-brief/ingest/route.test.ts`

Expected: FAIL because the ingestion route does not exist yet.

**Step 3: Write minimal implementation**

Implement a route that:

- validates scheduler auth
- loads active editorial sources
- runs the existing feed-first ingestion helper
- writes a candidate snapshot for the requested run date
- returns structured counts

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/app/api/internal/daily-brief/ingest/route.test.ts`

Expected: PASS

### Task 4: Add failing tests for generation route and pipeline-stage fields

**Files:**
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/generate/route.ts`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/generate/route.test.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-history-schema.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-history-store.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-history-store.test.ts`

**Step 1: Write the failing tests**

Cover:

- generation reads the candidate snapshot instead of re-ingesting sources
- generation writes history entries with:
  - `status = draft`
  - `pipelineStage = generated` or `pdf_built`
- generation stores candidate and timestamp metadata
- generation skips already published briefs for the same run date/programme

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/api/internal/daily-brief/generate/route.test.ts src/lib/daily-brief-history-store.test.ts`

Expected: FAIL because stage fields and generation route do not exist yet.

**Step 3: Write minimal implementation**

Extend the history schema with:

- `pipelineStage`
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

Then implement the generation route to:

- load the candidate snapshot
- freeze topic selection
- call the existing generation runtime
- write delivery-ready history records

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/app/api/internal/daily-brief/generate/route.test.ts src/lib/daily-brief-history-store.test.ts`

Expected: PASS

### Task 5: Add failing tests for preflight route and ready-to-send gating

**Files:**
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/preflight/route.ts`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/preflight/route.test.ts`

**Step 1: Write the failing tests**

Cover:

- preflight blocks dispatch when no generated briefs exist
- preflight blocks dispatch when delivery-ready artifacts are missing
- preflight marks briefs `approved` and `preflight_passed` when ready
- preflight returns structured blockers and summary counts

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/api/internal/daily-brief/preflight/route.test.ts`

Expected: FAIL because the preflight route does not exist yet.

**Step 3: Write minimal implementation**

Implement a route that:

- validates scheduler auth
- loads the day history records
- verifies generation completeness
- updates ready briefs to:
  - `status = approved`
  - `pipelineStage = preflight_passed`
- returns blocker details when dispatch must be prevented

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/app/api/internal/daily-brief/preflight/route.test.ts`

Expected: PASS

### Task 6: Add failing tests for delivery and retry-delivery routes

**Files:**
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/deliver/route.ts`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/deliver/route.test.ts`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/retry-delivery/route.ts`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/retry-delivery/route.test.ts`

**Step 1: Write the failing tests**

Cover:

- `deliver` only operates on briefs that passed preflight
- `deliver` does not regenerate content
- partial delivery failures increment counters without losing success counts
- all-channel failure marks the brief `failed`
- retry route only retries failed recipient-channel combinations
- retry route respects `retryEligibleUntil`

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/api/internal/daily-brief/deliver/route.test.ts src/app/api/internal/daily-brief/retry-delivery/route.test.ts`

Expected: FAIL because the delivery stage routes do not exist yet.

**Step 3: Write minimal implementation**

Implement delivery routes that:

- load approved briefs for the run date
- dispatch using the existing Goodnotes and Notion helpers
- update delivery counters and timestamps
- mark:
  - `status = published` when delivery succeeds sufficiently
  - `status = failed` when all configured deliveries fail

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/app/api/internal/daily-brief/deliver/route.test.ts src/app/api/internal/daily-brief/retry-delivery/route.test.ts`

Expected: PASS

### Task 7: Refactor the existing fallback run route

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/run/route.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/run/route.test.ts`

**Step 1: Write the failing tests**

Cover:

- `run` can remain a manual fallback path
- `run` delegates to stage handlers or a stage-aware orchestration path
- `dryRun` still returns meaningful blockers

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/api/internal/daily-brief/run/route.test.ts`

Expected: FAIL because the fallback route still assumes a single-stage execution model.

**Step 3: Write minimal implementation**

Refactor the route so it:

- keeps current auth behavior
- supports stage-aware orchestration
- remains useful for operators without being the primary scheduler target

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/app/api/internal/daily-brief/run/route.test.ts`

Expected: PASS

### Task 8: Update Cloud Scheduler configuration for multi-job support

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/scripts/configure-daily-brief-scheduler.sh`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/scripts/deploy-cloud-run.sh`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/README.md`

**Step 1: Write the failing shell/documentation check**

Document the required multi-job defaults and then verify shell syntax.

**Step 2: Run shell validation**

Run: `bash -n scripts/configure-daily-brief-scheduler.sh scripts/deploy-cloud-run.sh`

Expected: PASS for syntax, but documentation and defaults are not yet aligned to the staged scheduler.

**Step 3: Write minimal implementation**

Update the scheduler helper to support explicit job creation/update for:

- `dailysparks-brief-ingest-0100`
- `dailysparks-brief-ingest-0300`
- `dailysparks-brief-ingest-0500`
- `dailysparks-brief-generate-0600`
- `dailysparks-brief-preflight-0850`
- `dailysparks-brief-deliver-0900`
- `dailysparks-brief-retry-0910`

Document:

- route targets
- schedules
- time zone
- secret reuse
- operator expectations

**Step 4: Re-run shell validation**

Run: `bash -n scripts/configure-daily-brief-scheduler.sh scripts/deploy-cloud-run.sh`

Expected: PASS

### Task 9: Update admin visibility for staged pipeline observability

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/daily-briefs/page.tsx`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/daily-briefs/[briefId]/page.tsx`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/daily-briefs/page.test.tsx`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx`

**Step 1: Write the failing UI tests**

Cover:

- list page shows `pipelineStage`
- detail page shows delivery counters and retry window
- failed briefs show `failureReason`

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/admin/editorial/daily-briefs/page.test.tsx 'src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx'`

Expected: FAIL because the UI does not yet display the staged pipeline model.

**Step 3: Write minimal implementation**

Update the admin UI to expose the new operational state fields without adding edit controls.

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/app/admin/editorial/daily-briefs/page.test.tsx 'src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx'`

Expected: PASS

### Task 10: Full verification and release

**Files:**
- Modify: any touched files above

**Step 1: Run focused tests**

Run: `npm test -- src/lib/daily-brief-candidate-store.test.ts src/app/api/internal/daily-brief/ingest/route.test.ts src/app/api/internal/daily-brief/generate/route.test.ts src/app/api/internal/daily-brief/preflight/route.test.ts src/app/api/internal/daily-brief/deliver/route.test.ts src/app/api/internal/daily-brief/retry-delivery/route.test.ts src/app/api/internal/daily-brief/run/route.test.ts src/lib/daily-brief-history-store.test.ts`

**Step 2: Run full tests**

Run: `npm test`

**Step 3: Run focused lint**

Run: `npm run lint -- src/lib src/app/api/internal/daily-brief src/app/admin/editorial/daily-briefs README.md`

**Step 4: Run production build**

Run: `npm run build`

**Step 5: Commit**

```bash
git add docs/plans src/lib src/app/api/internal/daily-brief src/app/admin/editorial/daily-briefs scripts README.md
git commit -m "feat: stage daily brief scheduler pipeline"
```
