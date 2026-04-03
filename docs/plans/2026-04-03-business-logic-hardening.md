# Business Logic Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align business-facing state across billing, admin operations, delivery readiness, manual test runs, and daily brief history so the system behaves consistently for families and operators.

**Architecture:** Introduce a small set of derived-state helpers instead of expanding raw persistence fields everywhere. Use the existing staged pipeline and profile stores, but tighten the state model at the edges: access state, Notion channel readiness, record kind, and delivery health rollups.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, existing local/Firestore stores

---

### Task 1: Formalize derived access state

**Files:**
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/access-state.ts`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/access-state.test.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/billing.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/users/users-admin-helpers.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/users/page.tsx`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/users/[parentId]/page.tsx`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/billing.test.ts`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/users/page.test.tsx`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/users/[parentId]/page.test.tsx`

**Step 1: Write failing tests for expired-trial derived state**

Add tests that prove:
- an expired trial resolves to a distinct derived state
- billing summary no longer says `Trial access` once the trial is over
- admin users list/detail stop labeling expired trials as normal trial families

**Step 2: Run focused tests to verify RED**

Run:

```bash
npm test -- src/lib/access-state.test.ts src/lib/billing.test.ts src/app/admin/editorial/users/page.test.tsx src/app/admin/editorial/users/[parentId]/page.test.tsx
```

Expected: FAIL because derived access state does not exist yet and current UI still treats expired trials as normal trial accounts.

**Step 3: Implement minimal derived access state helper**

Create a helper that derives a stable business-facing state from:
- `subscriptionStatus`
- `trialEndsAt`

Include labels for:
- active
- trial active
- trial expired
- free
- canceled

**Step 4: Wire helper into billing and admin users**

Update billing summary and admin user labels/counts/filters to use the derived state instead of raw `subscriptionStatus` where the UI is meant to represent effective customer state.

**Step 5: Run focused tests to verify GREEN**

Run the same command from Step 2 and confirm all tests pass.

### Task 2: Fix admin test-run business date handling

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-run-date.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/admin/daily-brief-test-run/route.ts`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/admin/daily-brief-test-run/route.test.ts`

**Step 1: Write failing tests for Hong Kong business-date defaults**

Add a test that freezes the clock in a time where UTC and Hong Kong fall on different dates, then assert the admin test route defaults to the next Hong Kong business date instead of raw UTC tomorrow.

**Step 2: Run focused test to verify RED**

Run:

```bash
npm test -- src/app/api/admin/daily-brief-test-run/route.test.ts
```

Expected: FAIL because the route still uses `toISOString().slice(0, 10)`.

**Step 3: Implement the minimal fix**

Add a helper for “next Hong Kong business date” and use it in the admin test route.

**Step 4: Run focused test to verify GREEN**

Run the same command from Step 2 and confirm the new test passes.

### Task 3: Reconstruct Notion channel state as configured / verified / healthy

**Files:**
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/notion-channel-state.ts`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/notion-channel-state.test.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/notion/database/route.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/notion/test-sync/route.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/components/notion-sync-card.tsx`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-stage-delivery.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/users/users-admin-helpers.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/users/[parentId]/page.tsx`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/notion-routes.test.ts`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/components/notion-sync-card.test.tsx`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/users/[parentId]/page.test.tsx`

**Step 1: Write failing tests for Notion readiness semantics**

Add tests that prove:
- archive creation is only `configured`, not yet `verified`
- first successful test sync makes the channel `verified`
- a failed first test sync does not mark the channel ready
- the UI/admin detail can show configured/verified/healthy separately

**Step 2: Run focused tests to verify RED**

Run:

```bash
npm test -- src/lib/notion-channel-state.test.ts src/app/api/notion-routes.test.ts src/components/notion-sync-card.test.tsx src/app/admin/editorial/users/[parentId]/page.test.tsx
```

Expected: FAIL because the code still relies on the raw `notionConnected` boolean.

**Step 3: Implement the minimal derived-state helper**

Derive:
- `configured`: workspace + archive exist
- `verified`: connection has succeeded at least once
- `healthy`: verified and last sync is not currently failed

Adjust routes so database creation does not mark verified, successful test sync does, and failure preserves or clears verified status appropriately.

**Step 4: Update delivery gating and surfaces**

Use the helper in:
- delivery attempt gating for Notion
- dashboard Notion card
- admin user labels/detail page

**Step 5: Run focused tests to verify GREEN**

Run the same command from Step 2 and confirm all tests pass.

### Task 4: Isolate test history from production history

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-history-schema.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-history-store-types.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-history-store.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/local-daily-brief-history-store.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/firestore-daily-brief-history-store.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-orchestrator.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/generate/route.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/preflight/route.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/deliver/route.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/retry-delivery/route.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/run/route.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/admin/daily-brief-test-run/route.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/daily-briefs/page.tsx`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/daily-briefs/[briefId]/page.tsx`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-history-store.test.ts`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-orchestrator.test.ts`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/generate/route.test.ts`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/preflight/route.test.ts`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/deliver/route.test.ts`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/retry-delivery/route.test.ts`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/run/route.test.ts`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/admin/daily-brief-test-run/route.test.ts`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/daily-briefs/page.test.tsx`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx`

**Step 1: Write failing tests for record-kind isolation**

Add tests that prove:
- test runs create `test` records, not production records
- production generate/idempotency ignores test records
- admin daily briefs default view does not mix test and production history

**Step 2: Run focused tests to verify RED**

Run:

```bash
npm test -- src/lib/daily-brief-history-store.test.ts src/lib/daily-brief-orchestrator.test.ts src/app/api/internal/daily-brief/generate/route.test.ts src/app/api/admin/daily-brief-test-run/route.test.ts src/app/admin/editorial/daily-briefs/page.test.tsx src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx
```

Expected: FAIL because history records do not yet distinguish test and production.

**Step 3: Implement minimal record-kind support**

Add `recordKind: "production" | "test"` to history records and stage route inputs. Default production everywhere. Pass `test` through the manual admin test run flow.

**Step 4: Update admin history views**

Show record kind in detail and keep the default list scoped to production records unless operators explicitly request test history.

**Step 5: Run focused tests to verify GREEN**

Run the same command from Step 2 and confirm all tests pass.

### Task 5: Add per-family delivery health rollup

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-stage-delivery.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/mvp-store.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/users/users-admin-helpers.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/users/[parentId]/page.tsx`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/components/notion-sync-card.tsx`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-stage-delivery.test.ts`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/users/page.test.tsx`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/users/[parentId]/page.test.tsx`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/components/notion-sync-card.test.tsx`

**Step 1: Write failing tests for delivery health rollup**

Add tests that prove:
- successful daily delivery updates the family’s latest Goodnotes/Notion health snapshot
- failed delivery updates the latest status/message without corrupting readiness semantics
- admin/user-facing surfaces can show “needs attention” when the last daily delivery failed

**Step 2: Run focused tests to verify RED**

Run:

```bash
npm test -- src/lib/daily-brief-stage-delivery.test.ts src/app/admin/editorial/users/page.test.tsx src/app/admin/editorial/users/[parentId]/page.test.tsx src/components/notion-sync-card.test.tsx
```

Expected: FAIL because delivery attempts do not yet roll up status back to profile-level metadata.

**Step 3: Implement minimal rollup**

On daily delivery attempts:
- update Goodnotes last delivery status/message on the student record
- update Notion last sync status/message/page metadata on the parent record

Keep verified/configured semantics intact while making health observable.

**Step 4: Run focused tests to verify GREEN**

Run the same command from Step 2 and confirm all tests pass.

### Task 6: Full verification, docs touch-up, and deployment

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/README.md` (only if operator-facing behavior changed materially)
- Verify all modified tests above plus impacted integration tests

**Step 1: Run lint**

```bash
npm run lint -- src/lib src/app/api/admin src/app/api/internal/daily-brief src/app/admin/editorial src/components
```

Expected: PASS

**Step 2: Run full test suite**

```bash
npm test
```

Expected: PASS

**Step 3: Run production build**

```bash
npm run build
```

Expected: PASS (existing known non-blocking warnings may still appear)

**Step 4: Commit**

```bash
git add docs/plans/2026-04-03-business-logic-hardening.md src/lib src/app src/components README.md
git commit -m "fix: harden business state consistency"
```

**Step 5: Deploy**

```bash
./scripts/deploy-cloud-run.sh
```

**Step 6: Post-deploy smoke**

Run the key live checks:
- admin login page loads
- users admin page loads
- daily briefs page loads
- unauthorized internal daily-brief route still returns `401`
- admin test run route still requires admin auth
