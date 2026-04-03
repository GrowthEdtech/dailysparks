# Daily Brief Automation Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the five highest-risk automation gaps so the staged daily brief pipeline behaves correctly in Hong Kong time, avoids duplicate generation, respects trial expiry, handles canary skips safely, and validates generated output plus ingest coverage more honestly.

**Architecture:** Reuse the existing staged scheduler routes and store layer, but add one shared business-day helper for `runDate`, harden the generate and deliver stages for idempotent and recoverable behavior, tighten delivery eligibility rules, and add stricter output validation plus more truthful ingestion reporting. Keep the current App Router routes, local/Firestore store wrappers, and history schema, extending them only where needed for operator-safe automation.

**Tech Stack:** Next.js App Router route handlers, TypeScript, Vitest, local/Firestore store adapters, existing daily brief scheduler and delivery helpers

---

### Task 1: Normalize staged route business dates to Asia/Hong_Kong

**Files:**
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-run-date.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/ingest/route.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/generate/route.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/preflight/route.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/deliver/route.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/retry-delivery/route.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/run/route.ts`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-run-date.test.ts`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/ingest/route.test.ts`

**Step 1: Write the failing tests**

Cover:
- `01:00`, `03:00`, `05:00`, `06:00` Hong Kong executions resolve to the same Hong Kong business date, not the previous UTC date
- stage routes use the shared helper when `runDate` is omitted

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/daily-brief-run-date.test.ts src/app/api/internal/daily-brief/ingest/route.test.ts`

Expected: FAIL because the helper does not exist and routes still derive `runDate` from `toISOString().slice(0, 10)`.

**Step 3: Write minimal implementation**

Add:
- a Hong Kong `runDate` helper returning `YYYY-MM-DD`
- route updates so all staged handlers and fallback orchestration share the same business-day logic

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/daily-brief-run-date.test.ts src/app/api/internal/daily-brief/ingest/route.test.ts`

Expected: PASS

### Task 2: Make same-day generation idempotent

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-orchestrator.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/generate/route.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-history-store.ts`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/generate/route.test.ts`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/run/route.test.ts`

**Step 1: Write the failing tests**

Cover:
- rerunning `generate` on the same day does not create duplicate draft briefs for the same programme
- existing `draft`, `approved`, or `preflight_passed` briefs are treated as already-generated for idempotency
- rerunning fallback `/run` does not duplicate same-day briefs

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/api/internal/daily-brief/generate/route.test.ts src/app/api/internal/daily-brief/run/route.test.ts`

Expected: FAIL because generation currently only skips `published` entries.

**Step 3: Write minimal implementation**

Update generation logic so:
- same-day briefs are keyed effectively by `(scheduledFor, programme)`
- reruns skip existing non-failed briefs instead of creating duplicates
- route summaries report idempotent skips clearly

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/app/api/internal/daily-brief/generate/route.test.ts src/app/api/internal/daily-brief/run/route.test.ts`

Expected: PASS

### Task 3: Enforce trial expiry in delivery eligibility

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/local-profile-store.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/firestore-profile-store.ts`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/mvp-store.test.ts`

**Step 1: Write the failing tests**

Cover:
- `trial` profiles whose `trialEndsAt` is in the past are excluded from automated delivery eligibility
- `active` subscriptions still remain eligible
- future-dated trials remain eligible

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/mvp-store.test.ts`

Expected: FAIL because expired trial users still count as eligible delivery profiles.

**Step 3: Write minimal implementation**

Add expiry-aware eligibility checks using the stored `trialEndsAt` timestamp in both local and Firestore adapters.

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/mvp-store.test.ts`

Expected: PASS

### Task 4: Preserve deliverable briefs when canary has no matching recipients

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/deliver/route.ts`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/deliver/route.test.ts`

**Step 1: Write the failing tests**

Cover:
- if canary mode has eligible profiles overall but none selected for a specific programme, the brief is not marked `failed`
- the brief remains in a recoverable approved/preflight-ready state
- summary counts reflect the skip honestly

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/api/internal/daily-brief/deliver/route.test.ts`

Expected: FAIL because canary no-target cases are currently marked failed.

**Step 3: Write minimal implementation**

Change canary no-target behavior to:
- keep the brief recoverable instead of failed
- add admin notes describing the canary skip
- avoid consuming the brief for later full delivery

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/app/api/internal/daily-brief/deliver/route.test.ts`

Expected: PASS

### Task 5: Tighten output schema validation and source coverage reporting

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-orchestrator.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/preflight/route.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/ingest/route.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/editorial-feed-registry.ts`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-orchestrator.test.ts`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/preflight/route.test.ts`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/ingest/route.test.ts`

**Step 1: Write the failing tests**

Cover:
- generation rejects AI output missing required non-empty fields like `headline`, `summary`, `briefMarkdown`, or `topicTags`
- preflight blocks briefs with missing required output fields
- ingest summary distinguishes supported source coverage from merely active whitelist count

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/daily-brief-orchestrator.test.ts src/app/api/internal/daily-brief/preflight/route.test.ts src/app/api/internal/daily-brief/ingest/route.test.ts`

Expected: FAIL because output parsing is permissive and ingest summary currently overstates source coverage.

**Step 3: Write minimal implementation**

Add:
- stricter generated payload validation with clear error messages
- preflight checks for output completeness, not just markdown/source presence
- ingest summary fields for supported source count / unsupported source ids using feed-target resolution

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/daily-brief-orchestrator.test.ts src/app/api/internal/daily-brief/preflight/route.test.ts src/app/api/internal/daily-brief/ingest/route.test.ts`

Expected: PASS

### Task 6: Run full verification and ship safely

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/README.md`
- Verify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web`

**Step 1: Run focused regression checks**

Run:
- `npm test -- src/lib/daily-brief-run-date.test.ts src/app/api/internal/daily-brief/ingest/route.test.ts src/app/api/internal/daily-brief/generate/route.test.ts src/app/api/internal/daily-brief/preflight/route.test.ts src/app/api/internal/daily-brief/deliver/route.test.ts src/app/api/internal/daily-brief/run/route.test.ts src/lib/daily-brief-orchestrator.test.ts src/lib/mvp-store.test.ts`

Expected: PASS

**Step 2: Run full verification**

Run:
- `npm test`
- `npm run build`

Expected: PASS

**Step 3: Commit**

```bash
git add docs/plans/2026-04-03-daily-brief-automation-hardening.md src/ README.md
git commit -m "fix: harden daily brief automation flow"
```
