# Delivery Transparency Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make delivery decisions transparent and recoverable so operators can immediately see when production is still in canary mode, understand exactly which families were targeted or skipped and why, distinguish between real delivery failures and intentional skips, and manually resend or backfill a brief to one family without changing the global scheduler.

**Architecture:** Extend `DailyBriefHistoryRecord` with dispatch-audit metadata for each wave, surface the current production dispatch mode directly in the `Daily Briefs` admin UI, and add one admin-only resend endpoint plus a lightweight client panel on the brief detail page. Reuse the existing staged delivery routes, receipts model, admin auth, and profile stores rather than adding a second delivery pipeline.

**Tech Stack:** Next.js App Router route handlers, TypeScript, Vitest, existing daily-brief history store, admin editorial UI, local/Firestore adapters

---

### Task 1: Surface production canary mode directly in admin

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/daily-briefs/page.tsx`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/daily-briefs/page.test.tsx`

**Step 1: Write the failing tests**

Cover:
- when production delivery mode is `canary`, the `Daily Briefs` page shows an operator-visible warning banner
- the banner includes the active canary recipient list when configured

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/admin/editorial/daily-briefs/page.test.tsx`

Expected: FAIL because the page currently has no production canary visibility.

**Step 3: Write minimal implementation**

Add:
- a production-only banner on `Daily Briefs`
- clear copy that production dispatch is currently limited to canary recipients
- configured canary emails when available

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/app/admin/editorial/daily-briefs/page.test.tsx`

Expected: PASS

### Task 2: Persist dispatch audience audit on each brief history record

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-history-schema.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-history-store.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-history-store-types.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/local-daily-brief-history-store.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/firestore-daily-brief-history-store.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/deliver/route.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/retry-delivery/route.ts`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/deliver/route.test.ts`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/retry-delivery/route.test.ts`

**Step 1: Write the failing tests**

Cover:
- canary delivery stores the dispatch mode plus targeted and skipped families
- local-window partial delivery stores pending future families
- no-healthy-channel holds store a precise held reason instead of only relying on admin notes
- retry preserves or refreshes the latest audience audit without losing existing receipts

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/api/internal/daily-brief/deliver/route.test.ts src/app/api/internal/daily-brief/retry-delivery/route.test.ts`

Expected: FAIL because history does not yet persist explicit dispatch audience audit metadata.

**Step 3: Write minimal implementation**

Add per-brief audit fields for:
- `dispatchMode`
- canary recipient allowlist snapshot
- targeted families
- skipped families
- pending future-window families
- held families with no dispatchable channel

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/app/api/internal/daily-brief/deliver/route.test.ts src/app/api/internal/daily-brief/retry-delivery/route.test.ts`

Expected: PASS

### Task 3: Make skipped-family reasons precise in ops summary

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/daily-briefs/daily-brief-ops-summary.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/daily-briefs/page.tsx`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/daily-briefs/\\[briefId\\]/page.tsx`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/daily-briefs/daily-brief-ops-summary.test.ts`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/daily-briefs/page.test.tsx`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/daily-briefs/\\[briefId\\]/page.test.tsx`

**Step 1: Write the failing tests**

Cover:
- ops summary prefers stored audit reasons such as `Skipped by canary mode` and `Pending future local delivery window`
- detail view shows dispatch audience audit so operators can see which families were targeted or held

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/admin/editorial/daily-briefs/daily-brief-ops-summary.test.ts src/app/admin/editorial/daily-briefs/page.test.tsx src/app/admin/editorial/daily-briefs/\\[briefId\\]/page.test.tsx`

Expected: FAIL because ops summary still infers generic reasons from missing receipts.

**Step 3: Write minimal implementation**

Update ops/admin UI so:
- skipped reasons come from the dispatch audit first
- generic `No delivery receipt recorded` becomes a true last-resort fallback
- brief detail shows dispatch governance alongside receipts and failures

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/app/admin/editorial/daily-briefs/daily-brief-ops-summary.test.ts src/app/admin/editorial/daily-briefs/page.test.tsx src/app/admin/editorial/daily-briefs/\\[briefId\\]/page.test.tsx`

Expected: PASS

### Task 4: Add admin per-user resend/backfill for one brief

**Files:**
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/admin/daily-brief-resend/route.ts`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/admin/daily-brief-resend/route.test.ts`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/daily-briefs/\\[briefId\\]/manual-resend-panel.tsx`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/daily-briefs/\\[briefId\\]/page.tsx`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/daily-briefs/\\[briefId\\]/page.test.tsx`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-stage-delivery.ts`

**Step 1: Write the failing tests**

Cover:
- admin-only resend rejects unauthenticated requests
- resend/backfill can deliver a stored brief to one requested family email
- resend updates receipts, delivery counters, and admin notes
- detail page renders a manual resend panel for operators

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/api/admin/daily-brief-resend/route.test.ts src/app/admin/editorial/daily-briefs/\\[briefId\\]/page.test.tsx`

Expected: FAIL because the resend route and panel do not exist yet.

**Step 3: Write minimal implementation**

Add:
- admin-only resend route
- one-family resend/backfill flow using the existing stored brief and delivery helpers
- a detail-page form for operators to trigger resend by parent email

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/app/api/admin/daily-brief-resend/route.test.ts src/app/admin/editorial/daily-briefs/\\[briefId\\]/page.test.tsx`

Expected: PASS

### Task 5: Run verification and deploy safely

**Files:**
- Verify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web`

**Step 1: Run focused regression checks**

Run:
- `npm test -- src/app/api/internal/daily-brief/deliver/route.test.ts src/app/api/internal/daily-brief/retry-delivery/route.test.ts src/app/admin/editorial/daily-briefs/daily-brief-ops-summary.test.ts src/app/admin/editorial/daily-briefs/page.test.tsx src/app/admin/editorial/daily-briefs/\\[briefId\\]/page.test.tsx src/app/api/admin/daily-brief-resend/route.test.ts`

Expected: PASS

**Step 2: Run full verification**

Run:
- `npm run lint`
- `npm test`
- `npm run build`

Expected: PASS

**Step 3: Commit and deploy**

```bash
git add docs/plans/2026-04-04-delivery-transparency-hardening.md src/
git commit -m "fix: harden daily brief delivery transparency"
git push origin main
./scripts/deploy-cloud-run.sh
```
