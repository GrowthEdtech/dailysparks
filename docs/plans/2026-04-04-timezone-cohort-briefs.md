# Timezone Cohort Briefs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build APAC / EMEA / AMER timezone-cohort brief editions that share one locked global topic while generating and delivering separate brief records per cohort.

**Architecture:** Add a shared cohort model, lock the selected daily topic in the candidate snapshot, extend brief history with cohort identity, and make staged routes cohort-aware. Delivery continues to honor local delivery windows, but now only against cohort-matching brief editions.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, local/Firestore store abstractions, Cloud Scheduler.

---

### Task 1: Add cohort model and tests

**Files:**
- Create: `src/lib/daily-brief-cohorts.ts`
- Test: `src/lib/daily-brief-cohorts.test.ts`

**Step 1: Write the failing tests**

- cover timezone offset to cohort mapping
- cover parent profile to cohort mapping
- cover invalid / unknown timezone fallback behavior

**Step 2: Run the focused test**

Run: `npm test -- src/lib/daily-brief-cohorts.test.ts`
Expected: FAIL because the helper does not exist yet.

**Step 3: Write the minimal implementation**

- add `DAILY_BRIEF_EDITORIAL_COHORTS`
- add `DailyBriefEditorialCohort`
- add helpers:
  - `getEditorialCohortFromUtcOffsetMinutes`
  - `getEditorialCohortForTimeZone`
  - `getEditorialCohortForProfile`

**Step 4: Run the focused test again**

Run: `npm test -- src/lib/daily-brief-cohorts.test.ts`
Expected: PASS.

### Task 2: Lock the selected topic in candidate snapshots

**Files:**
- Modify: `src/lib/daily-brief-candidate-schema.ts`
- Modify: `src/lib/daily-brief-candidate-store-types.ts`
- Modify: `src/lib/daily-brief-candidate-store.ts`
- Modify: `src/lib/local-daily-brief-candidate-store.ts`
- Modify: `src/lib/firestore-daily-brief-candidate-store.ts`
- Test: `src/lib/daily-brief-candidate-store.test.ts`

**Step 1: Write the failing tests**

- cover persisting `selectedTopic`
- cover upsert preserving the locked topic across later writes

**Step 2: Run the focused test**

Run: `npm test -- src/lib/daily-brief-candidate-store.test.ts`
Expected: FAIL.

**Step 3: Write the minimal implementation**

- add `selectedTopic` to the snapshot schema
- normalize and store it in both backends

**Step 4: Run the focused test again**

Run: `npm test -- src/lib/daily-brief-candidate-store.test.ts`
Expected: PASS.

### Task 3: Make history cohort-aware

**Files:**
- Modify: `src/lib/daily-brief-history-schema.ts`
- Modify: `src/lib/daily-brief-history-store-types.ts`
- Modify: `src/lib/daily-brief-history-store.ts`
- Modify: `src/lib/local-daily-brief-history-store.ts`
- Modify: `src/lib/firestore-daily-brief-history-store.ts`
- Test: `src/lib/daily-brief-history-store.test.ts`

**Step 1: Write the failing tests**

- filter by `editorialCohort`
- preserve `editorialCohort` across create and update

**Step 2: Run the focused test**

Run: `npm test -- src/lib/daily-brief-history-store.test.ts`
Expected: FAIL.

**Step 3: Write the minimal implementation**

- extend the record schema and filters with `editorialCohort`

**Step 4: Run the focused test again**

Run: `npm test -- src/lib/daily-brief-history-store.test.ts`
Expected: PASS.

### Task 4: Refactor selection and generation to use cohort editions

**Files:**
- Modify: `src/lib/daily-brief-orchestrator.ts`
- Modify: `src/app/api/internal/daily-brief/generate/route.ts`
- Test: `src/lib/daily-brief-orchestrator.test.ts`
- Test: `src/app/api/internal/daily-brief/generate/route.test.ts`

**Step 1: Write the failing tests**

- first cohort generation locks the selected topic
- later cohort generation reuses the locked topic
- duplicate generation is blocked per cohort

**Step 2: Run focused tests**

Run: `npm test -- src/lib/daily-brief-orchestrator.test.ts src/app/api/internal/daily-brief/generate/route.test.ts`
Expected: FAIL.

**Step 3: Write the minimal implementation**

- accept `editorialCohort`
- derive cohort-specific eligible programmes
- create history records tagged with that cohort

**Step 4: Run focused tests again**

Run: `npm test -- src/lib/daily-brief-orchestrator.test.ts src/app/api/internal/daily-brief/generate/route.test.ts`
Expected: PASS.

### Task 5: Make preflight, deliver, and retry-delivery cohort-aware

**Files:**
- Modify: `src/app/api/internal/daily-brief/preflight/route.ts`
- Modify: `src/app/api/internal/daily-brief/deliver/route.ts`
- Modify: `src/app/api/internal/daily-brief/retry-delivery/route.ts`
- Modify: `src/lib/daily-brief-stage-delivery.ts`
- Modify: `src/lib/daily-brief-delivery-progress.ts`
- Test: `src/app/api/internal/daily-brief/preflight/route.test.ts`
- Test: `src/app/api/internal/daily-brief/deliver/route.test.ts`
- Test: `src/app/api/internal/daily-brief/retry-delivery/route.test.ts`

**Step 1: Write the failing tests**

- preflight only advances briefs for the requested cohort
- delivery only dispatches matching-cohort families
- retry only retries failed targets for the matching cohort

**Step 2: Run focused tests**

Run: `npm test -- src/app/api/internal/daily-brief/preflight/route.test.ts src/app/api/internal/daily-brief/deliver/route.test.ts src/app/api/internal/daily-brief/retry-delivery/route.test.ts`
Expected: FAIL.

**Step 3: Write the minimal implementation**

- add `editorialCohort` request parsing
- filter history entries and target profiles by cohort

**Step 4: Run focused tests again**

Run: `npm test -- src/app/api/internal/daily-brief/preflight/route.test.ts src/app/api/internal/daily-brief/deliver/route.test.ts src/app/api/internal/daily-brief/retry-delivery/route.test.ts`
Expected: PASS.

### Task 6: Update fallback run route and admin test run

**Files:**
- Modify: `src/app/api/internal/daily-brief/run/route.ts`
- Modify: `src/app/api/internal/daily-brief/run/route.test.ts`
- Modify: `src/app/api/admin/daily-brief-test-run/route.ts`
- Modify: `src/app/api/admin/daily-brief-test-run/route.test.ts`

**Step 1: Write the failing tests**

- fallback run orchestrates all cohorts
- admin test run preserves test record kind and targets one cohort

**Step 2: Run focused tests**

Run: `npm test -- src/app/api/internal/daily-brief/run/route.test.ts src/app/api/admin/daily-brief-test-run/route.test.ts`
Expected: FAIL.

**Step 3: Write the minimal implementation**

- orchestrate cohorts in a stable order
- expose cohort details in the response payloads

**Step 4: Run focused tests again**

Run: `npm test -- src/app/api/internal/daily-brief/run/route.test.ts src/app/api/admin/daily-brief-test-run/route.test.ts`
Expected: PASS.

### Task 7: Add cohort visibility to Daily Briefs admin

**Files:**
- Modify: `src/app/admin/editorial/daily-briefs/page.tsx`
- Modify: `src/app/admin/editorial/daily-briefs/[briefId]/page.tsx`
- Modify: `src/app/admin/editorial/daily-briefs/daily-brief-admin-helpers.ts`
- Test: `src/app/admin/editorial/daily-briefs/page.test.tsx`
- Test: `src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx`

**Step 1: Write the failing tests**

- cohort filter appears in the list page
- cohort badge appears in list and detail views

**Step 2: Run focused tests**

Run: `npm test -- src/app/admin/editorial/daily-briefs/page.test.tsx src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx`
Expected: FAIL.

**Step 3: Write the minimal implementation**

- add cohort filters and cohort labels/badges

**Step 4: Run focused tests again**

Run: `npm test -- src/app/admin/editorial/daily-briefs/page.test.tsx src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx`
Expected: PASS.

### Task 8: Replace scheduler jobs with cohort-specific production waves

**Files:**
- Modify: `scripts/configure-daily-brief-scheduler.sh`
- Modify: `README.md`
- Modify: `docs/plans/2026-04-03-daily-brief-operations-runbook.md`

**Step 1: Write the failing checks**

- inspect script output expectations and job naming manually

**Step 2: Implement**

- replace single-edition early/backstop job names with cohort-specific generate/preflight jobs
- keep rolling deliver/retry

**Step 3: Verify**

Run: `bash -n scripts/configure-daily-brief-scheduler.sh`
Expected: PASS.

### Task 9: Full verification, commit, deploy, and smoke test

**Files:**
- Verify the touched files above

**Step 1: Run focused tests**

Run: `npm test -- src/lib/daily-brief-cohorts.test.ts src/lib/daily-brief-candidate-store.test.ts src/lib/daily-brief-history-store.test.ts src/lib/daily-brief-orchestrator.test.ts src/app/api/internal/daily-brief/generate/route.test.ts src/app/api/internal/daily-brief/preflight/route.test.ts src/app/api/internal/daily-brief/deliver/route.test.ts src/app/api/internal/daily-brief/retry-delivery/route.test.ts src/app/api/internal/daily-brief/run/route.test.ts src/app/api/admin/daily-brief-test-run/route.test.ts src/app/admin/editorial/daily-briefs/page.test.tsx src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx`

**Step 2: Run full verification**

Run:
- `npm run lint`
- `npm test`
- `npm run build`

**Step 3: Commit**

```bash
git add docs/plans/2026-04-04-timezone-cohort-briefs-design.md docs/plans/2026-04-04-timezone-cohort-briefs.md src/lib src/app/api/internal/daily-brief src/app/api/admin/daily-brief-test-run src/app/admin/editorial/daily-briefs scripts/configure-daily-brief-scheduler.sh README.md docs/plans/2026-04-03-daily-brief-operations-runbook.md
git commit -m "feat: add timezone cohort brief editions"
```

**Step 4: Deploy and smoke**

Run:
- `./scripts/deploy-cloud-run.sh`
- `./scripts/configure-daily-brief-scheduler.sh`
- live smoke for `/admin/login`
- unauthorized smoke for `/api/internal/daily-brief/generate`

