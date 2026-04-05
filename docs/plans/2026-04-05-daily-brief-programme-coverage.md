# Daily Brief Programme Coverage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Decouple daily brief generation scope from delivery readiness and add an operator-visible programme coverage summary to `Daily Briefs`.

**Architecture:** Add a shared programme coverage helper that classifies active and dispatchable families per programme/cohort for a given run date. Update the orchestrator to generate from active audience coverage instead of delivery-eligible profiles, then use the same helper in the admin page to surface today’s coverage state.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, existing daily brief history/profile stores.

---

### Task 1: Add programme coverage helper

**Files:**
- Create: `src/lib/daily-brief-programme-coverage.ts`
- Test: `src/lib/daily-brief-programme-coverage.test.ts`

**Step 1: Write the failing test**

Cover:
- active families count by programme/cohort
- dispatchable families count by programme/cohort
- status labels for `generated`, `no active families`, `no healthy delivery channel`, `awaiting generation`

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/daily-brief-programme-coverage.test.ts`

Expected: FAIL because the helper does not exist yet.

**Step 3: Write minimal implementation**

Implement helpers that:
- filter profiles to active audience using derived access state
- reuse cohort filtering and dispatchable delivery logic
- build today’s per-programme/per-cohort coverage rows

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/daily-brief-programme-coverage.test.ts`

Expected: PASS

### Task 2: Switch generation scope to active audience coverage

**Files:**
- Modify: `src/lib/daily-brief-orchestrator.ts`
- Test: `src/lib/daily-brief-orchestrator.test.ts`

**Step 1: Write the failing test**

Add a test showing:
- `MYP` or `DP` with active access but non-dispatchable channels still generates
- programmes with zero active families still do not generate

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/daily-brief-orchestrator.test.ts`

Expected: FAIL because generation still depends on `listEligibleDeliveryProfiles()`.

**Step 3: Write minimal implementation**

Update orchestrator to:
- pull `listParentProfiles()`
- derive eligible generation programmes from active audience coverage helper
- keep downstream dispatch logic untouched

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/daily-brief-orchestrator.test.ts`

Expected: PASS

### Task 3: Surface programme coverage in `Daily Briefs`

**Files:**
- Modify: `src/app/admin/editorial/daily-briefs/page.tsx`
- Test: `src/app/admin/editorial/daily-briefs/page.test.tsx`

**Step 1: Write the failing test**

Add a page test that expects:
- a `Programme coverage` section
- visible rows/cards for `PYP`, `MYP`, `DP`
- status labels explaining absent programme generation

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/admin/editorial/daily-briefs/page.test.tsx`

Expected: FAIL because the section is not rendered yet.

**Step 3: Write minimal implementation**

Use the shared coverage helper with:
- today’s run date
- current profile set
- today’s production history

Render a compact summary above the history list. Prefer read-only, operator-facing clarity over added interactivity.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/app/admin/editorial/daily-briefs/page.test.tsx`

Expected: PASS

### Task 4: Verify route behavior stays coherent

**Files:**
- Test: `src/app/api/internal/daily-brief/generate/route.test.ts`

**Step 1: Write the failing test**

Add a route-level test proving:
- a programme with active access but no healthy channel still gets generated and stored

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/api/internal/daily-brief/generate/route.test.ts`

Expected: FAIL because route output still reflects the older generation scope.

**Step 3: Write minimal implementation**

Only adjust route output if needed to remain consistent with the orchestrator changes.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/app/api/internal/daily-brief/generate/route.test.ts`

Expected: PASS

### Task 5: Full verification and release

**Files:**
- Modify if needed based on verification output

**Step 1: Run focused verification**

Run:
- `npm test -- src/lib/daily-brief-programme-coverage.test.ts src/lib/daily-brief-orchestrator.test.ts src/app/admin/editorial/daily-briefs/page.test.tsx src/app/api/internal/daily-brief/generate/route.test.ts`
- `npm run lint -- src/lib/daily-brief-programme-coverage.ts src/lib/daily-brief-programme-coverage.test.ts src/lib/daily-brief-orchestrator.ts src/lib/daily-brief-orchestrator.test.ts src/app/admin/editorial/daily-briefs/page.tsx src/app/admin/editorial/daily-briefs/page.test.tsx src/app/api/internal/daily-brief/generate/route.ts src/app/api/internal/daily-brief/generate/route.test.ts`

**Step 2: Run full verification**

Run:
- `npm test`
- `npm run build`

Expected: PASS, with only the known baseline warnings if any.

**Step 3: Commit**

```bash
git add docs/plans/2026-04-05-daily-brief-programme-coverage-design.md docs/plans/2026-04-05-daily-brief-programme-coverage.md src/lib/daily-brief-programme-coverage.ts src/lib/daily-brief-programme-coverage.test.ts src/lib/daily-brief-orchestrator.ts src/lib/daily-brief-orchestrator.test.ts src/app/admin/editorial/daily-briefs/page.tsx src/app/admin/editorial/daily-briefs/page.test.tsx src/app/api/internal/daily-brief/generate/route.test.ts
git commit -m "feat: add daily brief programme coverage visibility"
```
