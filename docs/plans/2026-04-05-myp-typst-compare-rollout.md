# MYP Typst Compare-Only Rollout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a compare-only Typst rollout for MYP while keeping MYP production on pdf-lib and making validation visible in admin.

**Architecture:** Extend renderer policy so `auto` resolves Typst for MYP canary/test only, add MYP-specific packet/layout policy plus render-audit compliance data, then surface rollout state and validation guidance in admin list/detail and manual operator actions.

**Tech Stack:** Next.js app router, TypeScript, Vitest, pdf-lib, Typst

---

### Task 1: Extend renderer policy for MYP compare-only

**Files:**
- Modify: `src/lib/daily-brief-renderer-policy.ts`
- Test: `src/lib/daily-brief-renderer-policy.test.ts`

**Step 1: Write failing tests**
- Add expectations that `MYP + canary/test + auto` resolves to `typst`
- Add expectations that `MYP production + auto` remains `pdf-lib`
- Add a rollback env test for `MYP canary/test`

**Step 2: Implement**
- Add `DAILY_BRIEF_MYP_CANARY_RENDERER_DEFAULT`
- Update auto resolution and policy labels

### Task 2: Add MYP compare-only content budget and page policy

**Files:**
- Modify: `src/lib/outbound-daily-brief-packet.ts`
- Modify: `src/lib/outbound-daily-brief-typst.ts`
- Modify: `src/lib/daily-brief-history-schema.ts`
- Modify: `src/lib/daily-brief-render-audit.ts`
- Test: `src/lib/outbound-daily-brief-packet.test.ts`
- Test: `src/lib/outbound-daily-brief-typst.test.ts`

**Step 1: Write failing tests**
- Add MYP packet expectations for compare-only layout variant and tighter content budget
- Add Typst expectations for MYP compare-only layout
- Add render-audit expectations for a `2-page` policy

**Step 2: Implement**
- Add a `myp-compare` layout variant
- Add MYP compare-only truncation and section budget
- Add generic page-policy audit fields while preserving PYP one-page semantics

### Task 3: Expose MYP compare metrics in admin

**Files:**
- Modify: `src/app/admin/editorial/daily-briefs/daily-brief-ops-summary.ts`
- Modify: `src/app/admin/editorial/daily-briefs/page.tsx`
- Modify: `src/app/admin/editorial/daily-briefs/[briefId]/page.tsx`
- Test: `src/app/admin/editorial/daily-briefs/daily-brief-ops-summary.test.ts`
- Test: `src/app/admin/editorial/daily-briefs/page.test.tsx`
- Test: `src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx`

**Step 1: Write failing tests**
- Add MYP compare-only metrics to ops summary
- Add list-page rollout copy and ratios
- Add detail-page compare-only rollout and page-policy messaging

**Step 2: Implement**
- Surface `MYP compare-only`, `MYP Typst audited`, `MYP page-policy compliance`
- Keep PYP stabilization metrics intact

### Task 4: Add manual validation guidance for MYP

**Files:**
- Modify: `src/app/admin/editorial/daily-briefs/manual-test-run-panel.tsx`
- Modify: `src/app/admin/editorial/daily-briefs/[briefId]/manual-resend-panel.tsx`
- Modify: `src/app/api/admin/daily-brief-test-run/route.ts`
- Test: `src/app/api/admin/daily-brief-test-run/route.test.ts`
- Test: `src/app/api/admin/daily-brief-resend/route.test.ts`

**Step 1: Write failing tests**
- Verify MYP staged test auto resolves to Typst
- Verify admin copy explains the compare-only resend path

**Step 2: Implement**
- Update operator messaging
- Pass the programme context into the resend panel
- Keep resend `auto` safe on MYP production

### Task 5: Verify and ship

**Files:**
- No new product code

**Steps**
- Run focused tests
- Run lint
- Run full `npm test`
- Run `npm run build`
- Commit
- Push
- Deploy
- Smoke-check live routes
